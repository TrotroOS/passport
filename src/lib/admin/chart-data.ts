import type { SupabaseClient } from "@supabase/supabase-js";

export interface AdminDayPoint {
  date: string;
  label: string;
  count: number;
}

export interface AdminMultiSeriesPoint {
  date: string;
  label: string;
  shipments: number;
  users: number;
  organizations: number;
}

export interface AdminAiDayPoint {
  date: string;
  label: string;
  requests: number;
  cost: number;
  errors: number;
}

export interface AdminNamedCount {
  name: string;
  count: number;
  key?: string;
}

export interface AdminDashboardChartsData {
  activityTrend: AdminMultiSeriesPoint[];
  aiTrend: AdminAiDayPoint[];
  errorTrend: AdminDayPoint[];
  shipmentStatus: AdminNamedCount[];
  feedbackStatus: AdminNamedCount[];
  topOrganizations: AdminNamedCount[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function formatDayLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function buildDayBuckets(days: number): string[] {
  const keys: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY_MS);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

function countByDay(rows: Array<{ created_at: string }>, days: number): AdminDayPoint[] {
  const buckets = buildDayBuckets(days);
  const counts = new Map<string, number>(buckets.map((k) => [k, 0]));
  for (const row of rows) {
    const key = dayKey(row.created_at);
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return buckets.map((date) => ({
    date,
    label: formatDayLabel(date),
    count: counts.get(date) ?? 0,
  }));
}

function buildActivityTrend(
  shipments: Array<{ created_at: string }>,
  users: Array<{ created_at: string }>,
  organizations: Array<{ created_at: string }>,
  days: number
): AdminMultiSeriesPoint[] {
  const buckets = buildDayBuckets(days);
  const ship = new Map(buckets.map((k) => [k, 0]));
  const usr = new Map(buckets.map((k) => [k, 0]));
  const org = new Map(buckets.map((k) => [k, 0]));

  for (const row of shipments) {
    const k = dayKey(row.created_at);
    if (ship.has(k)) ship.set(k, (ship.get(k) ?? 0) + 1);
  }
  for (const row of users) {
    const k = dayKey(row.created_at);
    if (usr.has(k)) usr.set(k, (usr.get(k) ?? 0) + 1);
  }
  for (const row of organizations) {
    const k = dayKey(row.created_at);
    if (org.has(k)) org.set(k, (org.get(k) ?? 0) + 1);
  }

  return buckets.map((date) => ({
    date,
    label: formatDayLabel(date),
    shipments: ship.get(date) ?? 0,
    users: usr.get(date) ?? 0,
    organizations: org.get(date) ?? 0,
  }));
}

function buildAiTrend(
  logs: Array<{ created_at: string; cost: number | null; status: string | null }>,
  days: number
): AdminAiDayPoint[] {
  const buckets = buildDayBuckets(days);
  const requests = new Map(buckets.map((k) => [k, 0]));
  const cost = new Map(buckets.map((k) => [k, 0]));
  const errors = new Map(buckets.map((k) => [k, 0]));

  for (const row of logs) {
    const k = dayKey(row.created_at);
    if (!requests.has(k)) continue;
    requests.set(k, (requests.get(k) ?? 0) + 1);
    cost.set(k, (cost.get(k) ?? 0) + (Number(row.cost) || 0));
    if (row.status === "error" || row.status === "rate_limited") {
      errors.set(k, (errors.get(k) ?? 0) + 1);
    }
  }

  return buckets.map((date) => ({
    date,
    label: formatDayLabel(date),
    requests: requests.get(date) ?? 0,
    cost: Math.round((cost.get(date) ?? 0) * 100) / 100,
    errors: errors.get(date) ?? 0,
  }));
}

function countByField(
  rows: Array<Record<string, unknown>>,
  field: string,
  labelFn?: (key: string) => string
): AdminNamedCount[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const raw = row[field];
    const key = typeof raw === "string" ? raw : "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([key, count]) => ({
      key,
      name: labelFn ? labelFn(key) : key.replace(/_/g, " "),
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function fetchAdminDashboardChartsData(
  admin: SupabaseClient
): Promise<AdminDashboardChartsData> {
  const since30d = new Date(Date.now() - 30 * DAY_MS).toISOString();
  const since14d = new Date(Date.now() - 14 * DAY_MS).toISOString();

  const [
    { data: shipmentsRecent },
    { data: usersRecent },
    { data: orgsRecent },
    { data: aiLogs },
    { data: errorsRecent },
    { data: allShipments },
    { data: allFeedback },
    { data: shipmentsWithOrg },
  ] = await Promise.all([
    admin.from("shipments").select("created_at").gte("created_at", since30d).limit(5000),
    admin.from("users").select("created_at").gte("created_at", since30d).limit(5000),
    admin.from("organizations").select("created_at").gte("created_at", since30d).limit(5000),
    admin
      .from("ai_provider_logs")
      .select("created_at, cost, status")
      .gte("created_at", since30d)
      .limit(10000),
    admin.from("error_logs").select("created_at").gte("created_at", since14d).limit(5000),
    admin.from("shipments").select("status").limit(5000),
    admin.from("feedback").select("status").limit(5000),
    admin
      .from("shipments")
      .select("organization_id, organizations(name)")
      .limit(5000),
  ]);

  const orgCounts = new Map<string, { name: string; count: number }>();
  for (const row of shipmentsWithOrg ?? []) {
    const orgId = row.organization_id as string;
    const orgRel = row.organizations;
    const name =
      orgRel &&
      typeof orgRel === "object" &&
      !Array.isArray(orgRel) &&
      "name" in orgRel &&
      typeof (orgRel as { name: unknown }).name === "string"
        ? (orgRel as { name: string }).name
        : "Unknown";
    const existing = orgCounts.get(orgId);
    if (existing) {
      existing.count += 1;
    } else {
      orgCounts.set(orgId, { name, count: 1 });
    }
  }

  const topOrganizations = Array.from(orgCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((o) => ({ name: o.name, count: o.count }));

  return {
    activityTrend: buildActivityTrend(
      (shipmentsRecent ?? []) as Array<{ created_at: string }>,
      (usersRecent ?? []) as Array<{ created_at: string }>,
      (orgsRecent ?? []) as Array<{ created_at: string }>,
      30
    ),
    aiTrend: buildAiTrend(
      (aiLogs ?? []) as Array<{ created_at: string; cost: number | null; status: string | null }>,
      30
    ),
    errorTrend: countByDay((errorsRecent ?? []) as Array<{ created_at: string }>, 14),
    shipmentStatus: countByField(
      (allShipments ?? []) as Array<Record<string, unknown>>,
      "status",
      formatStatusLabel
    ),
    feedbackStatus: countByField(
      (allFeedback ?? []) as Array<Record<string, unknown>>,
      "status",
      formatStatusLabel
    ),
    topOrganizations,
  };
}
