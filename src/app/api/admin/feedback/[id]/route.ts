import {
  adminError,
  adminSuccess,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { updateFeedbackSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const ctx = await requirePlatformAdmin();
  if (ctx instanceof Response) return ctx;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateFeedbackSchema.safeParse(body);

  if (!parsed.success) {
    return adminError(parsed.error.errors[0]?.message ?? "Invalid input", 400);
  }

  const { data: updated, error } = await ctx.admin
    .from("feedback")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error || !updated) {
    return adminError(error?.message ?? "Update failed", 404);
  }

  return adminSuccess({ feedback: updated });
}
