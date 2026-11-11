import { Suspense } from "react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardMain } from "@/components/dashboard/dashboard-main";
import { getSessionUser } from "@/lib/auth/get-session-user";

function HeaderFallback() {
  return <div className="h-14 border-b bg-white sm:h-16" />;
}

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
  const user = await getSessionUser();

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      <Suspense fallback={<HeaderFallback />}>
        <DashboardHeader userId={user.id} />
      </Suspense>
      <Suspense fallback={<DashboardMainFallback />}>
        <DashboardMain userId={user.id} organizationId={null} />
      </Suspense>
    </div>
  );
}
