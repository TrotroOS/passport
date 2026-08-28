"use client";

import { AuditExportButton } from "@/components/shipments/audit-export-button";
import { ShareCollaboratorDialog } from "@/components/shipments/share-collaborator-dialog";
import { ShipmentPrintReport } from "@/components/shipments/shipment-print-report";
import type {
  AuditEvent,
  Discrepancy,
  Party,
  PassportScore,
  Product,
  Shipment,
  WorkflowTask,
} from "@/types/database";

interface ShipmentDetailActionsProps {
  shipmentId: string;
  shipment: Shipment;
  score: PassportScore | null;
  parties: Party[];
  products: Product[];
  documentCount: number;
  openDiscrepancies: Discrepancy[];
  openTasks: WorkflowTask[];
  auditEvents: AuditEvent[];
  organizationName?: string;
  isOwner: boolean;
}

export function ShipmentDetailActions({
  shipmentId,
  shipment,
  score,
  parties,
  products,
  documentCount,
  openDiscrepancies,
  openTasks,
  auditEvents,
  organizationName,
  isOwner,
}: ShipmentDetailActionsProps) {
  return (
    <div className="flex w-full min-w-0 flex-wrap gap-2 print:hidden">
      <AuditExportButton
        shipmentId={shipmentId}
        shipmentRef={shipment.shipment_ref}
        compact
        className="min-w-0 flex-1 sm:flex-none"
      />
      <ShipmentPrintReport
        compact
        className="min-w-0 flex-1 sm:flex-none"
        shipment={shipment}
        score={score}
        parties={parties}
        products={products}
        documentCount={documentCount}
        openDiscrepancies={openDiscrepancies}
        openTasks={openTasks}
        auditEvents={auditEvents}
        organizationName={organizationName}
      />
      {isOwner ? (
        <div className="w-full min-w-0 sm:w-auto">
          <ShareCollaboratorDialog shipmentId={shipmentId} />
        </div>
      ) : null}
    </div>
  );
}
