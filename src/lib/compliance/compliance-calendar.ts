import { createAdminClient } from "@/lib/supabase/admin";

export type CalendarEventType =
  | "task_due"
  | "task_overdue"
  | "tracking"
  | "clearance_target"
  | "screening_review";

export type CalendarUrgency = "overdue" | "urgent" | "upcoming" | "normal";

export interface ComplianceCalendarEvent {
  id: string;
  shipment_id: string;
  shipment_ref: string;
  title: string;
  description: string;
  event_type: CalendarEventType;
  due_at: string;
  priority?: string;
  status?: string;
  is_overdue: boolean;
  urgency: CalendarUrgency;
}

export interface ComplianceCalendarSummary {
  total: number;
  overdue: number;
  this_week: number;
  by_type: Record<CalendarEventType, number>;
}

export interface ComplianceCalendarResult {
  events: ComplianceCalendarEvent[];
  summary: ComplianceCalendarSummary;
}

const MS_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_DAY);
}

function classifyUrgency(dueAt: string, now: Date): { is_overdue: boolean; urgency: CalendarUrgency } {
  const due = startOfDay(new Date(dueAt));
  const today = startOfDay(now);
  const diffDays = Math.round((due.getTime() - today.getTime()) / MS_DAY);

  if (diffDays < 0) {
    return { is_overdue: true, urgency: "overdue" };
  }
  if (diffDays <= 2) {
    return { is_overdue: false, urgency: "urgent" };
  }
  if (diffDays <= 7) {
    return { is_overdue: false, urgency: "upcoming" };
  }
  return { is_overdue: false, urgency: "normal" };
}

function unwrapShipment<T extends { shipment_ref: string; organization_id: string }>(
  raw: T | T[] | null
): T | null {
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] ?? null : raw;
}

type ShipmentJoin =
  | { shipment_ref: string; organization_id: string }
  | { shipment_ref: string; organization_id: string }[]
  | null;

function pushEvent(
  events: ComplianceCalendarEvent[],
  now: Date,
  event: Omit<ComplianceCalendarEvent, "is_overdue" | "urgency">
): void {
  const { is_overdue, urgency } = classifyUrgency(event.due_at, now);
  events.push({ ...event, is_overdue, urgency });
}

export async function getComplianceCalendarEvents(
  organizationId: string,
  fromIso: string,
  toIso: string
): Promise<ComplianceCalendarResult> {
  const admin = createAdminClient();
  const now = new Date();
  const events: ComplianceCalendarEvent[] = [];
  const from = new Date(fromIso);
  const to = new Date(toIso);

  const [{ data: tasks }, { data: overdueTasks }, { data: tracking }, { data: shipments }] =
    await Promise.all([
      admin
        .from("workflow_tasks")
        .select(
          "id, title, description, due_date, priority, status, shipment_id, shipments!inner(shipment_ref, organization_id)"
        )
        .eq("shipments.organization_id", organizationId)
        .not("due_date", "is", null)
        .gte("due_date", fromIso)
        .lte("due_date", toIso)
        .in("status", ["open", "in_progress", "blocked"]),
      admin
        .from("workflow_tasks")
        .select(
          "id, title, description, due_date, priority, status, shipment_id, shipments!inner(shipment_ref, organization_id)"
        )
        .eq("shipments.organization_id", organizationId)
        .not("due_date", "is", null)
        .lt("due_date", now.toISOString())
        .in("status", ["open", "in_progress", "blocked"]),
      admin
        .from("shipment_tracking_events")
        .select(
          "id, event_type, description, event_date, shipment_id, shipments!inner(shipment_ref, organization_id)"
        )
        .eq("shipments.organization_id", organizationId)
        .not("event_date", "is", null)
        .gte("event_date", fromIso)
        .lte("event_date", toIso)
        .order("event_date", { ascending: true }),
      admin
        .from("shipments")
        .select("id, shipment_ref, created_at, updated_at, status, owner_confirmed_ready, broker_confirmed_ready")
        .eq("organization_id", organizationId)
        .in("status", ["in_review", "documents_uploaded", "draft"]),
    ]);

  let screenings: Array<{
    id: string;
    screened_name: string;
    match_status: string;
    match_score: number;
    screened_at: string;
    shipment_id: string;
    shipments: { shipment_ref: string; organization_id: string } | { shipment_ref: string; organization_id: string }[];
  }> = [];

  try {
    const { data } = await admin
      .from("party_screenings")
      .select(
        "id, screened_name, match_status, match_score, screened_at, shipment_id, shipments!inner(shipment_ref, organization_id)"
      )
      .eq("organization_id", organizationId)
      .in("match_status", ["potential_match", "confirmed_match"])
      .gte("screened_at", fromIso)
      .lte("screened_at", toIso);
    screenings = data ?? [];
  } catch {
    // party_screenings table may be missing before migration 018
  }

  for (const task of tasks ?? []) {
    const shipment = unwrapShipment(task.shipments as ShipmentJoin);
    if (!shipment) continue;
    pushEvent(events, now, {
      id: `task-${task.id}`,
      shipment_id: task.shipment_id,
      shipment_ref: shipment.shipment_ref,
      title: task.title,
      description: task.description ?? "Workflow task due",
      event_type: "task_due",
      due_at: task.due_date as string,
      priority: task.priority,
      status: task.status,
    });
  }

  for (const task of overdueTasks ?? []) {
    const shipment = unwrapShipment(task.shipments as ShipmentJoin);
    if (!shipment) continue;
    pushEvent(events, now, {
      id: `overdue-${task.id}`,
      shipment_id: task.shipment_id,
      shipment_ref: shipment.shipment_ref,
      title: task.title,
      description: task.description ?? "Overdue workflow task",
      event_type: "task_overdue",
      due_at: task.due_date as string,
      priority: task.priority,
      status: task.status,
    });
  }

  for (const ev of tracking ?? []) {
    const shipment = unwrapShipment(ev.shipments as ShipmentJoin);
    if (!shipment) continue;
    pushEvent(events, now, {
      id: `tracking-${ev.id}`,
      shipment_id: ev.shipment_id,
      shipment_ref: shipment.shipment_ref,
      title: ev.event_type.replace(/_/g, " "),
      description: ev.description ?? "Scheduled tracking milestone",
      event_type: "tracking",
      due_at: ev.event_date as string,
    });
  }

  for (const s of shipments ?? []) {
    if (s.owner_confirmed_ready && s.broker_confirmed_ready) continue;

    const base = new Date(s.updated_at ?? s.created_at);
    const target = addDays(base, s.status === "draft" ? 21 : 14);
    if (target < from || target > to) continue;

    pushEvent(events, now, {
      id: `clearance-${s.id}`,
      shipment_id: s.id,
      shipment_ref: s.shipment_ref,
      title: "Clearance readiness target",
      description: `Shipment in ${s.status.replace(/_/g, " ")} — complete verification and readiness confirmation`,
      event_type: "clearance_target",
      due_at: target.toISOString(),
      status: s.status,
    });
  }

  for (const screening of screenings ?? []) {
    const shipment = unwrapShipment(screening.shipments as ShipmentJoin);
    if (!shipment) continue;

    const followUp = addDays(new Date(screening.screened_at), 3);
    if (followUp < from || followUp > to) continue;

    pushEvent(events, now, {
      id: `screening-${screening.id}`,
      shipment_id: screening.shipment_id,
      shipment_ref: shipment.shipment_ref,
      title: "Party screening review",
      description: `${screening.screened_name} — ${screening.match_status.replace(/_/g, " ")} (${screening.match_score}% match)`,
      event_type: "screening_review",
      due_at: followUp.toISOString(),
      status: screening.match_status,
    });
  }

  const sorted = events.sort(
    (a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime()
  );

  const weekEnd = addDays(startOfDay(now), 7);
  const summary: ComplianceCalendarSummary = {
    total: sorted.length,
    overdue: sorted.filter((e) => e.is_overdue).length,
    this_week: sorted.filter((e) => {
      const due = new Date(e.due_at);
      return due >= startOfDay(now) && due <= weekEnd;
    }).length,
    by_type: {
      task_due: 0,
      task_overdue: 0,
      tracking: 0,
      clearance_target: 0,
      screening_review: 0,
    },
  };

  for (const event of sorted) {
    summary.by_type[event.event_type] += 1;
  }

  return { events: sorted, summary };
}

export function getMonthBounds(year: number, month: number): { from: string; to: string } {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}
