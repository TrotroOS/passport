import {
  adminError,
  adminSuccess,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { updateDocumentAbbreviationSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const ctx = await requirePlatformAdmin();
  if (ctx instanceof Response) return ctx;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateDocumentAbbreviationSchema.safeParse(body);

  if (!parsed.success) {
    return adminError(parsed.error.errors[0]?.message ?? "Invalid input", 400);
  }

  const { data: abbreviation, error } = await ctx.admin
    .from("document_abbreviations")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error || !abbreviation) {
    return adminError(error?.message ?? "Update failed", 500);
  }

  return adminSuccess({ abbreviation });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const ctx = await requirePlatformAdmin();
  if (ctx instanceof Response) return ctx;

  const { id } = await params;

  const { data: abbreviation, error } = await ctx.admin
    .from("document_abbreviations")
    .update({ is_active: false })
    .eq("id", id)
    .select()
    .single();

  if (error || !abbreviation) {
    return adminError(error?.message ?? "Deactivate failed", 500);
  }

  return adminSuccess({ abbreviation });
}
