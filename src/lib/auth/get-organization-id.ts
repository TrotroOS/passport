import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Resolve organization ID for the authenticated user.
 * Falls back to get_user_organization_id() RPC, then admin read (server-only).
 */
export async function getOrganizationIdForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data: profile } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.organization_id) {
    return profile.organization_id;
  }

  const { data: orgIdFromRpc, error } = await supabase.rpc("get_user_organization_id");

  if (!error && orgIdFromRpc) {
    return orgIdFromRpc as string;
  }

  const admin = createAdminClient();
  const { data: adminProfile } = await admin
    .from("users")
    .select("organization_id")
    .eq("id", userId)
    .maybeSingle();

  return adminProfile?.organization_id ?? null;
}

/**
 * Insert a shipment using admin client after verifying the session user owns the org.
 * Used when RLS policies are missing/broken on the remote database.
 */
export async function insertShipmentForUser(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string,
  payload: {
    shipment_ref: string;
    origin_country?: string | null;
    destination_country?: string | null;
  }
) {
  const admin = createAdminClient();

  const { data: verified } = await admin
    .from("users")
    .select("organization_id")
    .eq("id", userId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!verified) {
    return { data: null, error: { message: "Organization not found for user" } };
  }

  return admin
    .from("shipments")
    .insert({
      ...payload,
      organization_id: organizationId,
      created_by: userId,
    })
    .select()
    .single();
}

export const ORG_NOT_FOUND_MESSAGE =
  "Organization not found. Run supabase/migrations/20240820000010_fix_rls_reapply.sql in Supabase SQL Editor, then run: npm run check-db";

export type UserProfileRow = {
  id: string;
  email: string;
  phone?: string | null;
  organization_id: string | null;
  organizations?: { name: string } | { name: string }[] | null;
};

/** Read the signed-in user's profile, with admin fallback when RLS blocks reads. */
export async function getUserProfileForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<UserProfileRow | null> {
  const { data: profile } = await supabase
    .from("users")
    .select("id, email, phone, organization_id, organizations(name)")
    .eq("id", userId)
    .maybeSingle();

  if (profile) {
    return profile as UserProfileRow;
  }

  const organizationId = await getOrganizationIdForUser(supabase, userId);
  if (!organizationId) {
    return null;
  }

  const admin = createAdminClient();
  const { data: adminProfile } = await admin
    .from("users")
    .select("id, email, phone, organization_id, organizations(name)")
    .eq("id", userId)
    .maybeSingle();

  return (adminProfile as UserProfileRow | null) ?? null;
}
