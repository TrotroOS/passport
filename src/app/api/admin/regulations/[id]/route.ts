import {
  adminError,
  adminSuccess,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { updateRegulationSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const ctx = await requirePlatformAdmin();
  if (ctx instanceof Response) return ctx;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateRegulationSchema.safeParse(body);

  if (!parsed.success) {
    return adminError(parsed.error.errors[0]?.message ?? "Invalid input", 400);
  }

  const { data: regulation, error } = await ctx.admin
    .from("regulations")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error || !regulation) {
    return adminError(error?.message ?? "Update failed", 404);
  }

  return adminSuccess({ regulation });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const ctx = await requirePlatformAdmin();
  if (ctx instanceof Response) return ctx;

  const { id } = await params;

  const { data: regulation, error } = await ctx.admin
    .from("regulations")
    .update({ is_active: false })
    .eq("id", id)
    .select()
    .single();

  if (error || !regulation) {
    return adminError(error?.message ?? "Deactivate failed", 404);
  }

  return adminSuccess({ regulation, deactivated: true });
}
