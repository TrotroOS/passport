import {
  adminError,
  adminSuccess,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { createDocumentAbbreviationSchema } from "@/lib/validations";

export async function GET() {
  const ctx = await requirePlatformAdmin();
  if (ctx instanceof Response) return ctx;

  const { data: abbreviations } = await ctx.admin
    .from("document_abbreviations")
    .select("*")
    .order("abbreviation");

  return adminSuccess({ abbreviations: abbreviations ?? [] });
}

export async function POST(request: Request) {
  const ctx = await requirePlatformAdmin();
  if (ctx instanceof Response) return ctx;

  const body = await request.json().catch(() => null);
  const parsed = createDocumentAbbreviationSchema.safeParse(body);

  if (!parsed.success) {
    return adminError(parsed.error.errors[0]?.message ?? "Invalid input", 400);
  }

  const { data: abbreviation, error } = await ctx.admin
    .from("document_abbreviations")
    .insert(parsed.data)
    .select()
    .single();

  if (error || !abbreviation) {
    return adminError(error?.message ?? "Create failed", 500);
  }

  return adminSuccess({ abbreviation }, 201);
}
