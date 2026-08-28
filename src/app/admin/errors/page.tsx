import { getPlatformAdminContext } from "@/lib/admin/require-platform-admin";
import { formatDate } from "@/lib/utils";
import { AdminErrorFilters } from "@/components/admin/admin-error-filters";

interface PageProps {
  searchParams: Promise<{
    severity?: string;
    organization_id?: string;
    from?: string;
    to?: string;
  }>;
}

export default async function AdminErrorsPage({ searchParams }: PageProps) {
  const ctx = await getPlatformAdminContext();
  if (!ctx) return null;

  const params = await searchParams;

  let query = ctx.admin
    .from("error_logs")
    .select("*, organizations(name), users(email)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (params.severity) query = query.eq("severity", params.severity);
  if (params.organization_id) query = query.eq("organization_id", params.organization_id);
  if (params.from) query = query.gte("created_at", params.from);
  if (params.to) query = query.lte("created_at", params.to);

  const [{ data: errors }, { data: orgs }] = await Promise.all([
    query,
    ctx.admin.from("organizations").select("id, name").order("name"),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-foreground">Error Logs</h1>
      <AdminErrorFilters organizations={orgs ?? []} initial={params} />
      <div className="mt-4 space-y-3">
        {(errors ?? []).map((err) => {
          const org = err.organizations as { name: string } | null;
          const user = err.users as { email: string } | null;
          return (
            <details
              key={err.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <summary className="cursor-pointer text-sm text-foreground">
                <span className="mr-2 font-medium uppercase text-destructive">{err.severity}</span>
                {err.error_message}
                <span className="ml-2 text-muted-foreground">
                  · {formatDate(err.created_at)}
                  {org?.name ? ` · ${org.name}` : ""}
                  {err.route ? ` · ${err.method ?? "GET"} ${err.route}` : ""}
                </span>
              </summary>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                {user?.email && <p>User: {user.email}</p>}
                {err.stack_trace && (
                  <pre className="overflow-x-auto rounded bg-muted/30 p-3 text-xs text-foreground/90">
                    {err.stack_trace}
                  </pre>
                )}
              </div>
            </details>
          );
        })}
        {(errors ?? []).length === 0 && (
          <p className="text-muted-foreground">No error logs found.</p>
        )}
      </div>
    </div>
  );
}
