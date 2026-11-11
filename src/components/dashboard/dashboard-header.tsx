import { AppHeader } from "@/components/layout/app-header";
import { getUserProfileForUser } from "@/lib/auth/get-organization-id";
import { createClient } from "@/lib/supabase/server";

export async function DashboardHeader({ userId }: { userId: string }) {
  const supabase = await createClient();
  const profile = await getUserProfileForUser(supabase, userId);
  const orgName =
    profile?.organizations &&
    typeof profile.organizations === "object" &&
    "name" in profile.organizations
      ? (profile.organizations as { name: string }).name
      : undefined;

  return (
    <AppHeader
      organizationName={orgName}
      userEmail={profile?.email}
      isPlatformAdmin={profile?.is_platform_admin === true}
    />
  );
}
