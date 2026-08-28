import { getPlatformAdminContext } from "@/lib/admin/require-platform-admin";
import { AdminFeedbackTable } from "@/components/admin/admin-feedback-table";

export default async function AdminFeedbackPage() {
  const ctx = await getPlatformAdminContext();
  if (!ctx) return null;

  const { data: feedback } = await ctx.admin
    .from("feedback")
    .select("*, users(email, full_name), organizations(name)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-foreground">User Feedback</h1>
      <AdminFeedbackTable items={feedback ?? []} />
    </div>
  );
}
