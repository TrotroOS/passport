import {
  adminSuccess,
  requirePlatformAdmin,
} from "@/lib/admin/require-platform-admin";

export async function GET() {
  const ctx = await requirePlatformAdmin();
  if (ctx instanceof Response) return ctx;

  const { data: orgs } = await ctx.admin
    .from("organizations")
    .select("*")
    .order("created_at", { ascending: false });

  const enriched = await Promise.all(
    (orgs ?? []).map(async (org) => {
      const [{ count: userCount }, { count: shipmentCount }] = await Promise.all([
        ctx.admin
          .from("users")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", org.id),
        ctx.admin
          .from("shipments")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", org.id),
      ]);

      return {
        ...org,
        user_count: userCount ?? 0,
        shipment_count: shipmentCount ?? 0,
        status: (shipmentCount ?? 0) > 0 ? "active" : "inactive",
      };
    })
  );

  return adminSuccess({ organizations: enriched });
}
