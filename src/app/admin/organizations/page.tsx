import Link from "next/link";
import { getPlatformAdminContext } from "@/lib/admin/require-platform-admin";
import { formatDate } from "@/lib/utils";

export default async function AdminOrganizationsPage() {
  const ctx = await getPlatformAdminContext();
  if (!ctx) return null;

  const { data: orgs } = await ctx.admin
    .from("organizations")
    .select("*")
    .order("created_at", { ascending: false });

  const enriched = await Promise.all(
    (orgs ?? []).map(async (org) => {
      const [{ count: userCount }, { count: shipmentCount }] = await Promise.all([
        ctx.admin.from("users").select("*", { count: "exact", head: true }).eq("organization_id", org.id),
        ctx.admin.from("shipments").select("*", { count: "exact", head: true }).eq("organization_id", org.id),
      ]);
      return { ...org, user_count: userCount ?? 0, shipment_count: shipmentCount ?? 0 };
    })
  );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-foreground">Organizations</h1>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-card text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Users</th>
              <th className="px-4 py-3">Shipments</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-muted/30">
            {enriched.map((org) => (
              <tr key={org.id} className="hover:bg-card">
                <td className="px-4 py-3">
                  <Link href={`/admin/organizations/${org.id}`} className="font-medium text-primary hover:underline">
                    {org.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-foreground/90">{org.slug}</td>
                <td className="px-4 py-3">{org.user_count}</td>
                <td className="px-4 py-3">{org.shipment_count}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(org.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
