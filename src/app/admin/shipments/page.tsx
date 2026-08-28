import Link from "next/link";
import { getPlatformAdminContext } from "@/lib/admin/require-platform-admin";
import { formatDate, formatStatus } from "@/lib/utils";
import { AdminShipmentFilters } from "@/components/admin/admin-shipment-filters";

interface PageProps {
  searchParams: Promise<{
    organization_id?: string;
    status?: string;
    from?: string;
    to?: string;
  }>;
}

export default async function AdminShipmentsPage({ searchParams }: PageProps) {
  const ctx = await getPlatformAdminContext();
  if (!ctx) return null;

  const params = await searchParams;

  let query = ctx.admin
    .from("shipments")
    .select("*, organizations(name), passport_scores(overall_score), risk_assessments(risk_level)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (params.organization_id) query = query.eq("organization_id", params.organization_id);
  if (params.status) query = query.eq("status", params.status);
  if (params.from) query = query.gte("created_at", params.from);
  if (params.to) query = query.lte("created_at", params.to);

  const [{ data: shipments }, { data: orgs }] = await Promise.all([
    query,
    ctx.admin.from("organizations").select("id, name").order("name"),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-foreground">Shipments</h1>
      <AdminShipmentFilters organizations={orgs ?? []} initial={params} />
      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-card text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Organization</th>
              <th className="px-4 py-3">Route</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Risk</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-muted/30">
            {(shipments ?? []).map((s) => {
              const scores = s.passport_scores as { overall_score: number }[] | null;
              const risks = s.risk_assessments as { risk_level: string }[] | null;
              const org = s.organizations as { name: string } | null;
              return (
                <tr key={s.id} className="hover:bg-card">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/shipments/${s.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {s.shipment_ref}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-foreground/90">{org?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-foreground/90">
                    {s.origin_country ?? "—"} → {s.destination_country ?? "—"}
                  </td>
                  <td className="px-4 py-3">{formatStatus(s.status)}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {Array.isArray(scores) && scores[0] ? scores[0].overall_score : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {Array.isArray(risks) && risks[0]
                      ? formatStatus(risks[0].risk_level)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(s.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
