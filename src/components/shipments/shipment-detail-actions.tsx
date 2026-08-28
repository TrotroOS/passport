"use client";

import { AuditExportButton } from "@/components/shipments/audit-export-button";
import { ShareCollaboratorDialog } from "@/components/shipments/share-collaborator-dialog";
import { ShipmentPrintReport } from "@/components/shipments/shipment-print-report";

interface ShipmentDetailActionsProps {
  shipmentId: string;
  shipmentRef: string;
  isOwner: boolean;
}

export function ShipmentDetailActions({
  shipmentId,
  shipmentRef,
  isOwner,
}: ShipmentDetailActionsProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 no-print print:hidden md:flex-nowrap md:justify-end">
      <AuditExportButton
        shipmentId={shipmentId}
        shipmentRef={shipmentRef}
        compact
        className="shrink-0"
      />
      <ShipmentPrintReport compact className="shrink-0" shipmentId={shipmentId} />
      {isOwner ? (
        <ShareCollaboratorDialog shipmentId={shipmentId} className="shrink-0" />
      ) : null}
    </div>
  );
}
