import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getUserProfileForUser } from "@/lib/auth/get-organization-id";
import { AppHeader } from "@/components/layout/app-header";
import { DashboardMain } from "@/components/dashboard/dashboard-main";
function DashboardMainFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-8 h-10 w-48 animate-pulse rounded bg-slate-100" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg border bg-slate-50" />
        ))}
      </div>
    </div>
  );
}

export const preferredRegion = ["fra1"];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const profile = await getUserProfileForUser(supabase, user.id);
  const organizationId = profile?.organization_id ?? null;
  const orgName =
    profile?.organizations &&
    typeof profile.organizations === "object" &&
    "name" in profile.organizations
      ? (profile.organizations as { name: string }).name
      : undefined;

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      <AppHeader
        organizationName={orgName}
        userEmail={profile?.email}
        isPlatformAdmin={profile?.is_platform_admin === true}
      />
      <Suspense fallback={<DashboardMainFallback />}>
        <DashboardMain userId={user.id} organizationId={organizationId} />
      </Suspense>
    </div>
  );
}
