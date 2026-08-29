import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CollaboratorParticipantType,
  CollaboratorRole,
  CollaboratorStatus,
  ShipmentCollaborator,
} from "@/types/database";

const ENTITY_TYPE = "external_collaborator_invite";
const ACTION = "collaborator.external_invited";

export interface StoredExternalInvite {
  id: string;
  shipment_id: string;
  organization_id: string;
  invitee_email: string;
  role: CollaboratorRole;
  participant_type: CollaboratorParticipantType;
  status: CollaboratorStatus;
  invited_by: string | null;
  invited_at: string;
}

type AuditInviteRow = {
  id: string;
  entity_id: string | null;
  organization_id: string;
  shipment_id: string | null;
  user_id: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

function fromAuditRow(row: AuditInviteRow): StoredExternalInvite | null {
  if (!row.entity_id || !row.shipment_id) return null;
  const metadata = row.metadata ?? {};
  const email = metadata.invitee_email;
  if (typeof email !== "string") return null;

  return {
    id: row.entity_id,
    shipment_id: row.shipment_id,
    organization_id: row.organization_id,
    invitee_email: email.toLowerCase(),
    role: (metadata.role as CollaboratorRole) ?? "viewer",
    participant_type:
      (metadata.participant_type as CollaboratorParticipantType) ??
      "collaborator",
    status: (metadata.status as CollaboratorStatus) ?? "pending",
    invited_by: typeof metadata.invited_by === "string" ? metadata.invited_by : row.user_id,
    invited_at:
      typeof metadata.invited_at === "string" ? metadata.invited_at : row.created_at,
  };
}

const INVITE_SELECT_FIELDS =
  "id, entity_id, organization_id, shipment_id, user_id, created_at, metadata" as const;

function isAuditInviteRow(value: unknown): value is AuditInviteRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.organization_id === "string" &&
    "entity_id" in row &&
    "shipment_id" in row &&
    "metadata" in row
  );
}

function inviteQuery(admin: SupabaseClient) {
  return admin
    .from("audit_events")
    .select(INVITE_SELECT_FIELDS)
    .eq("entity_type", ENTITY_TYPE)
    .eq("action", ACTION);
}

export function toShipmentCollaborator(invite: StoredExternalInvite): ShipmentCollaborator {
  return {
    id: invite.id,
    shipment_id: invite.shipment_id,
    organization_id: null,
    user_id: null,
    invitee_email: invite.invitee_email,
    role: invite.role,
    participant_type: invite.participant_type,
    status: invite.status,
    invited_by: invite.invited_by,
    invited_at: invite.invited_at,
    accepted_at: invite.status === "active" ? invite.invited_at : null,
    revoked_at: invite.status === "revoked" ? invite.invited_at : null,
    created_at: invite.invited_at,
    updated_at: invite.invited_at,
    users: null,
    organizations: null,
  };
}

export async function createExternalInvite(
  admin: SupabaseClient,
  params: {
    shipmentId: string;
    organizationId: string;
    invitedBy: string;
    email: string;
    role: CollaboratorRole;
    participantType?: CollaboratorParticipantType;
  }
): Promise<StoredExternalInvite> {
  const id = crypto.randomUUID();
  const invitedAt = new Date().toISOString();
  const email = params.email.trim().toLowerCase();

  const { error } = await admin.from("audit_events").insert({
    organization_id: params.organizationId,
    user_id: params.invitedBy,
    action: ACTION,
    entity_type: ENTITY_TYPE,
    entity_id: id,
    shipment_id: params.shipmentId,
    metadata: {
      invitee_email: email,
      role: params.role,
      participant_type: params.participantType ?? "collaborator",
      status: "pending",
      invited_at: invitedAt,
      invited_by: params.invitedBy,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    id,
    shipment_id: params.shipmentId,
    organization_id: params.organizationId,
    invitee_email: email,
    role: params.role,
    participant_type: params.participantType ?? "collaborator",
    status: "pending",
    invited_by: params.invitedBy,
    invited_at: invitedAt,
  };
}

export async function getExternalInviteById(
  admin: SupabaseClient,
  invitationId: string
): Promise<StoredExternalInvite | null> {
  const { data, error } = await inviteQuery(admin)
    .eq("entity_id", invitationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !isAuditInviteRow(data)) return null;
  return fromAuditRow(data);
}

export async function findPendingExternalInviteByEmail(
  admin: SupabaseClient,
  shipmentId: string,
  email: string
): Promise<StoredExternalInvite | null> {
  const normalized = email.trim().toLowerCase();
  const { data, error } = await inviteQuery(admin)
    .eq("shipment_id", shipmentId)
    .contains("metadata", { invitee_email: normalized, status: "pending" })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !isAuditInviteRow(data)) return null;
  return fromAuditRow(data);
}

export async function listExternalInvitesForShipment(
  admin: SupabaseClient,
  shipmentId: string
): Promise<StoredExternalInvite[]> {
  const { data } = await inviteQuery(admin)
    .eq("shipment_id", shipmentId)
    .order("created_at", { ascending: false });

  const seen = new Set<string>();
  const invites: StoredExternalInvite[] = [];

  for (const row of data ?? []) {
    if (!isAuditInviteRow(row)) continue;
    const invite = fromAuditRow(row);
    if (!invite || seen.has(invite.id)) continue;
    if (invite.status === "declined" || invite.status === "revoked") continue;
    seen.add(invite.id);
    invites.push(invite);
  }

  return invites;
}

export async function updateExternalInviteStatus(
  admin: SupabaseClient,
  invitationId: string,
  status: CollaboratorStatus,
  extraMetadata: Record<string, unknown> = {}
): Promise<StoredExternalInvite | null> {
  const existing = await getExternalInviteById(admin, invitationId);
  if (!existing) return null;

  const metadata = {
    invitee_email: existing.invitee_email,
    role: existing.role,
    participant_type: existing.participant_type,
    status,
    invited_at: existing.invited_at,
    invited_by: existing.invited_by,
    ...extraMetadata,
  };

  const { data, error } = await admin
    .from("audit_events")
    .update({ metadata })
    .eq("entity_id", invitationId)
    .eq("entity_type", ENTITY_TYPE)
    .eq("action", ACTION)
    .select(INVITE_SELECT_FIELDS)
    .maybeSingle();

  if (error || !isAuditInviteRow(data)) return null;
  return fromAuditRow(data);
}

export async function findExternalInvitesForEmail(
  admin: SupabaseClient,
  email: string
): Promise<StoredExternalInvite[]> {
  const normalized = email.trim().toLowerCase();
  const { data } = await inviteQuery(admin).contains("metadata", {
    invitee_email: normalized,
    status: "pending",
  });

  const seen = new Set<string>();
  return (data ?? [])
    .filter(isAuditInviteRow)
    .map(fromAuditRow)
    .filter(Boolean)
    .filter((invite) => {
      if (!invite || seen.has(invite.id)) return false;
      seen.add(invite.id);
      return true;
    }) as StoredExternalInvite[];
}
