import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getUserProfileForUser } from "@/lib/auth/get-organization-id";

export interface SettingsContext {
  organizationName?: string;
  userEmail?: string;
}

export async function getSettingsContext(
  supabase?: SupabaseClient
): Promise<SettingsContext> {
  const client = supabase ?? (await createClient());
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getUserProfileForUser(client, user.id);

  const organizationName =
    profile?.organizations &&
    typeof profile.organizations === "object" &&
    "name" in profile.organizations
      ? (profile.organizations as { name: string }).name
      : undefined;

  return {
    organizationName,
    userEmail: profile?.email ?? user.email ?? undefined,
  };
}
