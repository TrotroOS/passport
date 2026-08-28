import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminRunbookView } from "@/components/admin/admin-runbook-view";
import { getPlatformAdminContext } from "@/lib/admin/require-platform-admin";

export default async function AdminRunbookPage() {
  const ctx = await getPlatformAdminContext();
  if (!ctx) return null;

  return (
    <div>
      <AdminPageHeader
        title="Operator runbook"
        description="Step-by-step procedures for daily operations, incidents, migrations, and platform administration."
      />
      <AdminRunbookView />
    </div>
  );
}
