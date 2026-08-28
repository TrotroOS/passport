import { adminSuccess, requirePlatformAdmin } from "@/lib/admin/require-platform-admin";

export async function GET() {
  const ctx = await requirePlatformAdmin();
  if (ctx instanceof Response) return ctx;

  const { data } = await ctx.admin
    .from("product_categories")
    .select("*")
    .order("name");

  return adminSuccess({ categories: data ?? [] });
}
