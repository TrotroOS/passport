import {
  adminSuccess,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";

export async function GET(request: Request) {
  const ctx = await requirePlatformAdmin();
  if (ctx instanceof Response) return ctx;

  const { searchParams } = new URL(request.url);
  const severity = searchParams.get("severity");
  const orgId = searchParams.get("organization_id");
  const from = searchParams.get("from");
  const limit = parseInt(searchParams.get("limit") ?? "100", 10);

  let query = ctx.admin
    .from("error_logs")
    .select("*, organizations(name), users(email)")
    .order("created_at", { ascending: false })
    .limit(Math.min(limit, 500));

  if (severity) query = query.eq("severity", severity);
  if (orgId) query = query.eq("organization_id", orgId);
  if (from) query = query.gte("created_at", from);

  const { data: errors } = await query;

  return adminSuccess({ errors: errors ?? [] });
}
