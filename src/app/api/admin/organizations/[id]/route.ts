import {
  adminError,
  adminSuccess,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const ctx = await requirePlatformAdmin();
  if (ctx instanceof Response) return ctx;

  const { id } = await params;

  const { data: org, error } = await ctx.admin
    .from("organizations")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !org) {
    return adminError("Organization not found", 404);
  }

  const [{ data: users }, { data: shipments }] = await Promise.all([
    ctx.admin.from("users").select("*").eq("organization_id", id).order("created_at"),
    ctx.admin
      .from("shipments")
      .select("*")
      .eq("organization_id", id)
      .order("created_at", { ascending: false }),
  ]);

  return adminSuccess({ organization: org, users: users ?? [], shipments: shipments ?? [] });
}
