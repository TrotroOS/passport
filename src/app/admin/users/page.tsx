import { getPlatformAdminContext } from "@/lib/admin/require-platform-admin";
import { AdminUsersTable } from "@/components/admin/admin-users-table";
import { AdminUserSearch } from "@/components/admin/admin-user-search";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const ctx = await getPlatformAdminContext();
  if (!ctx) return null;

  const { q } = await searchParams;

  let query = ctx.admin
    .from("users")
    .select("*, organizations(name, slug)")
    .order("created_at", { ascending: false });

  if (q?.trim()) {
    query = query.or(`email.ilike.%${q.trim()}%,full_name.ilike.%${q.trim()}%`);
  }

  const { data: users } = await query;

  const signInMap = new Map<string, string>();
  const { data: authData } = await ctx.admin.auth.admin.listUsers({ perPage: 1000 });
  for (const authUser of authData?.users ?? []) {
    if (authUser.last_sign_in_at) {
      signInMap.set(authUser.id, authUser.last_sign_in_at);
    }
  }

  const enriched = (users ?? []).map((u) => ({
    ...u,
    last_sign_in_at: signInMap.get(u.id) ?? null,
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-foreground">Users</h1>
      <AdminUserSearch initialQuery={q ?? ""} />
      <div className="mt-4">
        <AdminUsersTable users={enriched} currentUserId={ctx.userId} />
      </div>
    </div>
  );
}
