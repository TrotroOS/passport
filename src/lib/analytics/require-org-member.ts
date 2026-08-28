import type { SupabaseClient } from "@supabase/supabase-js";
import { getOrganizationIdForUser } from "@/lib/auth/get-organization-id";

export async function requireOrgMember(
  supabase: SupabaseClient,
  userId: string
): Promise<{ organizationId: string } | { error: string; status: 403 }> {
  const organizationId = await getOrganizationIdForUser(supabase, userId);
  if (!organizationId) {
    return { error: "Organization membership required", status: 403 };
  }
  return { organizationId };
}
