import {
  adminError,
  adminSuccess,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";
import { createRegulationSchema } from "@/lib/validations";

export async function GET() {
  const ctx = await requirePlatformAdmin();
  if (ctx instanceof Response) return ctx;

  const { data: regulations } = await ctx.admin
    .from("regulations")
    .select("*, jurisdictions(code, name), product_categories(code, name)")
    .order("title");

  return adminSuccess({ regulations: regulations ?? [] });
}

export async function POST(request: Request) {
  const ctx = await requirePlatformAdmin();
  if (ctx instanceof Response) return ctx;

  const body = await request.json().catch(() => null);
  const parsed = createRegulationSchema.safeParse(body);

  if (!parsed.success) {
    return adminError(parsed.error.errors[0]?.message ?? "Invalid input", 400);
  }

  const { data: regulation, error } = await ctx.admin
    .from("regulations")
    .insert(parsed.data)
    .select()
    .single();

  if (error || !regulation) {
    return adminError(error?.message ?? "Create failed", 500);
  }

  return adminSuccess({ regulation }, 201);
}
