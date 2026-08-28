import {
  adminSuccess,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";

export async function GET() {
  const ctx = await requirePlatformAdmin();
  if (ctx instanceof Response) return ctx;

  const { data: feedback } = await ctx.admin
    .from("feedback")
    .select("*, organizations(name), users(email, full_name)")
    .order("created_at", { ascending: false });

  return adminSuccess({ feedback: feedback ?? [] });
}
