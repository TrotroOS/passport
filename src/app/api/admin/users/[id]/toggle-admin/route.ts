import { writeAuditEvent } from "@/lib/audit";
import {
  adminError,
  adminSuccess,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const ctx = await requirePlatformAdmin();
  if (ctx instanceof Response) return ctx;

  const { id } = await params;

  if (id === ctx.userId) {
    return adminError("Cannot change your own admin status", 400);
  }

  const { data: user } = await ctx.admin
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  if (!user) {
    return adminError("User not found", 404);
  }

  const newStatus = !user.is_platform_admin;

  const { data: updated, error } = await ctx.admin
    .from("users")
    .update({ is_platform_admin: newStatus })
    .eq("id", id)
    .select()
    .single();

  if (error || !updated) {
    return adminError(error?.message ?? "Update failed", 500);
  }

  await writeAuditEvent(ctx.admin, {
    organizationId: user.organization_id ?? undefined,
    userId: ctx.userId,
    action: newStatus ? "admin.promoted" : "admin.demoted",
    entityType: "user",
    entityId: id,
    metadata: { email: user.email, by: ctx.email },
  });

  return adminSuccess({ user: updated });
}
