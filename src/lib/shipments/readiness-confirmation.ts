import { formatAuditTimestamp } from "@/lib/audit/audit-labels";
import type { AuditEvent, Shipment } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ReadinessPartyConfirmation {
  confirmed: boolean;
  confirmedAt: string | null;
  confirmedBy: string | null;
}

export interface ReadinessConfirmationDetails {
  owner: ReadinessPartyConfirmation;
  broker: ReadinessPartyConfirmation;
  allConfirmed: boolean;
}

const OWNER_ACTION = "shipment.owner_confirmed_ready";
const BROKER_ACTION = "shipment.broker_confirmed_ready";

function latestConfirmation(
  events: AuditEvent[],
  action: string,
  userNamesById: Map<string, string>
): ReadinessPartyConfirmation | null {
  const event = events.find((item) => item.action === action);
  if (!event) return null;

  const confirmedBy = event.user_id
    ? userNamesById.get(event.user_id) ?? event.user_id
    : null;

  return {
    confirmed: true,
    confirmedAt: event.created_at,
    confirmedBy,
  };
}

export function resolveReadinessConfirmationDetails(
  shipment: Pick<Shipment, "owner_confirmed_ready" | "broker_confirmed_ready">,
  auditEvents: AuditEvent[],
  userNamesById: Map<string, string> = new Map()
): ReadinessConfirmationDetails {
  const readinessEvents = [...auditEvents]
    .filter((event) => event.action === OWNER_ACTION || event.action === BROKER_ACTION)
    .sort(
      (left, right) =>
        new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    );

  const ownerFromAudit = latestConfirmation(readinessEvents, OWNER_ACTION, userNamesById);
  const brokerFromAudit = latestConfirmation(readinessEvents, BROKER_ACTION, userNamesById);

  const owner: ReadinessPartyConfirmation = {
    confirmed: shipment.owner_confirmed_ready,
    confirmedAt: ownerFromAudit?.confirmedAt ?? null,
    confirmedBy: ownerFromAudit?.confirmedBy ?? null,
  };

  const broker: ReadinessPartyConfirmation = {
    confirmed: shipment.broker_confirmed_ready,
    confirmedAt: brokerFromAudit?.confirmedAt ?? null,
    confirmedBy: brokerFromAudit?.confirmedBy ?? null,
  };

  return {
    owner,
    broker,
    allConfirmed: owner.confirmed && broker.confirmed,
  };
}

export function formatReadinessTimestamp(iso: string | null): string {
  if (!iso) return "—";
  return formatAuditTimestamp(iso);
}

export async function loadUserNamesForAuditEvents(
  admin: SupabaseClient,
  events: AuditEvent[]
): Promise<Map<string, string>> {
  const userIds = Array.from(
    new Set(events.map((event) => event.user_id).filter(Boolean))
  ) as string[];

  if (userIds.length === 0) {
    return new Map();
  }

  const { data: profiles } = await admin
    .from("users")
    .select("id, full_name, email")
    .in("id", userIds);

  return new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      profile.full_name?.trim() || profile.email || profile.id,
    ])
  );
}
