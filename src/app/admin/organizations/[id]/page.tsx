import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getPlatformAdminContext } from "@/lib/admin/require-platform-admin";
import { formatDate, formatStatus } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminOrganizationDetailPage({ params }: PageProps) {
  const ctx = await getPlatformAdminContext();
  if (!ctx) return null;

  const { id } = await params;

  const { data: org } = await ctx.admin
    .from("organizations")
    .select("*")
    .eq("id", id)
    .single();

  if (!org) notFound();

  const [{ data: users }, { data: shipments }] = await Promise.all([
    ctx.admin.from("users").select("*").eq("organization_id", id),
    ctx.admin.from("shipments").select("*").eq("organization_id", id).order("created_at", { ascending: false }),
  ]);

  return (
    <div>
      <AdminPageHeader title={org.name} description={org.slug} />

      <h2 className="mb-3 text-lg font-semibold text-foreground">Users</h2>
      <ul className="mb-8 space-y-2">
        {(users ?? []).map((u) => (
          <li key={u.id} className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
            {u.email} — {formatStatus(u.role)}
            {u.is_platform_admin && <Badge className="ml-2">Platform admin</Badge>}
          </li>
        ))}
        {(users ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No users in this organization.</p>
        )}
      </ul>

      <h2 className="mb-3 text-lg font-semibold text-foreground">Shipments</h2>
      <ul className="space-y-2">
        {(shipments ?? []).map((s) => (
          <li key={s.id} className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
            <Link href={`/admin/shipments/${s.id}`} className="font-medium text-primary hover:underline">
              {s.shipment_ref}
            </Link>
            <span className="ml-2 text-muted-foreground">{formatStatus(s.status)}</span>
            <span className="ml-2 text-muted-foreground">{formatDate(s.created_at)}</span>
          </li>
        ))}
        {(shipments ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No shipments for this organization.</p>
        )}
      </ul>
    </div>
  );
}
