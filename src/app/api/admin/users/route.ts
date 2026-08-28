import {
  adminSuccess,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";

export async function GET(request: Request) {
  const ctx = await requirePlatformAdmin();
  if (ctx instanceof Response) return ctx;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  let query = ctx.admin
    .from("users")
    .select("*, organizations(name, slug)")
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`);
  }

  const { data: users } = await query;

  return adminSuccess({ users: users ?? [] });
}
