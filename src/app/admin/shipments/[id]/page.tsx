import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPlatformAdminContext } from "@/lib/admin/require-platform-admin";
import { loadAdminShipmentDetail } from "@/lib/admin/load-shipment-detail";
import { AdminShipmentView } from "@/components/admin/admin-shipment-view";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminShipmentDetailPage({ params }: PageProps) {
  const ctx = await getPlatformAdminContext();
  if (!ctx) return null;

  const { id } = await params;
  const detail = await loadAdminShipmentDetail(ctx.admin, id);

  if (!detail) notFound();

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-6 text-muted-foreground hover:text-foreground">
        <Link href="/admin/shipments">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to shipments
        </Link>
      </Button>
      <AdminShipmentView shipmentId={id} detail={detail} />
    </div>
  );
}
