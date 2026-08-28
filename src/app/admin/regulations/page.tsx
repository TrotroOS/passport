import { getPlatformAdminContext } from "@/lib/admin/require-platform-admin";
import { AdminRegulationsManager } from "@/components/admin/admin-regulations-manager";

export default async function AdminRegulationsPage() {
  const ctx = await getPlatformAdminContext();
  if (!ctx) return null;

  const [{ data: regulations }, { data: jurisdictions }, { data: productCategories }] =
    await Promise.all([
      ctx.admin
        .from("regulations")
        .select("*, jurisdictions(code, name), product_categories(code, name)")
        .order("title"),
      ctx.admin.from("jurisdictions").select("*").order("name"),
      ctx.admin.from("product_categories").select("*").order("name"),
    ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-foreground">Regulations</h1>
      <AdminRegulationsManager
        regulations={regulations ?? []}
        jurisdictions={jurisdictions ?? []}
        productCategories={productCategories ?? []}
      />
    </div>
  );
}
