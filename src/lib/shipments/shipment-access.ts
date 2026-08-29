import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrganizationIdForUser } from "@/lib/auth/get-organization-id";
import type { Shipment, ShipmentCollaborator } from "@/types/database";
import {
  listExternalInvitesForShipment,
  toShipmentCollaborator,
} from "@/lib/collaboration/external-invite-store";
import { hasInviteeEmailColumn } from "@/lib/collaboration/schema-support";

export type CollaboratorRole = "viewer" | "commenter" | "editor";
export type ShipmentAccessLevel = "owner" | "collaborator" | "none";

export interface ShipmentAccess {
  level: ShipmentAccessLevel;
  role?: CollaboratorRole;
  collaboratorId?: string;
  shipmentOrganizationId?: string;
  userOrganizationId?: string | null;
}

export type ShipmentPermission =
  | "view"
  | "comment"
  | "upload"
  | "edit_tasks"
  | "owner_confirm"
  | "broker_confirm"
  | "invite"
  | "revoke";

const ROLE_PERMISSIONS: Record<CollaboratorRole, ShipmentPermission[]> = {
  viewer: ["view", "comment"],
  commenter: ["view", "comment", "upload"],
  editor: ["view", "comment", "upload", "edit_tasks", "broker_confirm"],
};

const OWNER_PERMISSIONS: ShipmentPermission[] = [
  "view",
  "comment",
  "upload",
  "edit_tasks",
  "owner_confirm",
  "invite",
  "revoke",
];

export function hasPermission(
  access: ShipmentAccess,
  permission: ShipmentPermission
): boolean {
  if (access.level === "none") return false;
  if (access.level === "owner") {
    return OWNER_PERMISSIONS.includes(permission);
  }
  if (access.level === "collaborator" && access.role) {
    return ROLE_PERMISSIONS[access.role].includes(permission);
  }
  return false;
}

export async function getShipmentAccess(
  supabase: SupabaseClient,
  userId: string,
  shipmentId: string
): Promise<ShipmentAccess & { shipment?: Shipment | null }> {
  const userOrganizationId = await getOrganizationIdForUser(supabase, userId);

  const { data: shipment } = await supabase
    .from("shipments")
    .select("*")
    .eq("id", shipmentId)
    .maybeSingle();

  if (shipment) {
    if (
      userOrganizationId &&
      shipment.organization_id === userOrganizationId
    ) {
      return {
        level: "owner",
        shipmentOrganizationId: shipment.organization_id,
        userOrganizationId,
        shipment,
      };
    }

    const { data: collaborator } = await supabase
      .from("shipment_collaborators")
      .select("*")
      .eq("shipment_id", shipmentId)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (collaborator) {
      return {
        level: "collaborator",
        role: collaborator.role as CollaboratorRole,
        collaboratorId: collaborator.id,
        shipmentOrganizationId: shipment.organization_id,
        userOrganizationId,
        shipment,
      };
    }
  }

  const admin = createAdminClient();

  if (userOrganizationId) {
    const { data: ownerShipment } = await admin
      .from("shipments")
      .select("*")
      .eq("id", shipmentId)
      .eq("organization_id", userOrganizationId)
      .maybeSingle();

    if (ownerShipment) {
      return {
        level: "owner",
        shipmentOrganizationId: ownerShipment.organization_id,
        userOrganizationId,
        shipment: ownerShipment,
      };
    }
  }

  const { data: collaborator } = await admin
    .from("shipment_collaborators")
    .select("*, shipments(*)")
    .eq("shipment_id", shipmentId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (collaborator?.shipments) {
    const collabShipment = collaborator.shipments as unknown as Shipment;
    return {
      level: "collaborator",
      role: collaborator.role as CollaboratorRole,
      collaboratorId: collaborator.id,
      shipmentOrganizationId: collabShipment.organization_id,
      userOrganizationId,
      shipment: collabShipment,
    };
  }

  return {
    level: "none",
    userOrganizationId,
    shipment: null,
  };
}

export async function requireShipmentPermission(
  supabase: SupabaseClient,
  userId: string,
  shipmentId: string,
  permission: ShipmentPermission
): Promise<
  | (ShipmentAccess & { shipment: Shipment })
  | { error: string; status: number }
> {
  const access = await getShipmentAccess(supabase, userId, shipmentId);

  if (!access.shipment || access.level === "none") {
    return { error: "Shipment not found", status: 404 };
  }

  if (!hasPermission(access, permission)) {
    return { error: "Forbidden", status: 403 };
  }

  return { ...access, shipment: access.shipment };
}

export async function listSharedShipmentsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<(Shipment & { collaborator_role: CollaboratorRole })[]> {
  const { data: rows } = await supabase
    .from("shipment_collaborators")
    .select("role, shipments(*)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("accepted_at", { ascending: false });

  if (!rows?.length) return [];

  return rows
    .map((row) => {
      const shipment = row.shipments as unknown as Shipment | null;
      if (!shipment) return null;
      return {
        ...shipment,
        collaborator_role: row.role as CollaboratorRole,
      };
    })
    .filter(Boolean) as (Shipment & { collaborator_role: CollaboratorRole })[];
}

export async function listCollaboratorsForShipment(
  supabase: SupabaseClient,
  shipmentId: string
): Promise<ShipmentCollaborator[]> {
  const { data } = await supabase
    .from("shipment_collaborators")
    .select("*, users(id, email, full_name), organizations(id, name)")
    .eq("shipment_id", shipmentId)
    .order("created_at", { ascending: false });

  const collaborators = (data ?? []) as ShipmentCollaborator[];

  const supportsInviteeEmail = await hasInviteeEmailColumn(supabase);
  if (supportsInviteeEmail) {
    return collaborators;
  }

  const externalInvites = await listExternalInvitesForShipment(supabase, shipmentId);
  const externalRows = externalInvites.map(toShipmentCollaborator);
  const seen = new Set(collaborators.map((row) => row.id));
  return [...collaborators, ...externalRows.filter((row) => !seen.has(row.id))];
}

/** @deprecated use getShipmentAccess + hasPermission */
export async function hasShipmentAccess(
  supabase: SupabaseClient,
  userId: string,
  shipmentId: string,
  permission: ShipmentPermission = "view"
): Promise<boolean> {
  const access = await getShipmentAccess(supabase, userId, shipmentId);
  return hasPermission(access, permission);
}
