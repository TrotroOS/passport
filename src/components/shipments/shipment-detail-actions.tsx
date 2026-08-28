"use client";

import { AuditExportButton } from "@/components/shipments/audit-export-button";
import { ShareCollaboratorDialog } from "@/components/shipments/share-collaborator-dialog";
import { ShipmentPrintReport } from "@/components/shipments/shipment-print-report";
import type { PassportScore, Shipment } from "@/types/database";

interface ShipmentDetailActionsProps {
  shipmentId: string;
  shipment: Shipment;
  score: PassportScore | null;
  organizationName?: string;
  isOwner: boolean;
}

export function ShipmentDetailActions({
  shipmentId,
  shipment,
  score,
  organizationName,
  isOwner,
}: ShipmentDetailActionsProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 no-print print:hidden md:flex-nowrap md:justify-end">
      <AuditExportButton
        shipmentId={shipmentId}
        shipmentRef={shipment.shipment_ref}
        compact
        className="shrink-0"
      />
      <ShipmentPrintReport
        compact
        className="shrink-0"
        shipment={shipment}
        score={score}
        organizationName={organizationName}
      />
      {isOwner ? (
        <ShareCollaboratorDialog shipmentId={shipmentId} className="shrink-0" />
      ) : null}
    </div>
  );
}
