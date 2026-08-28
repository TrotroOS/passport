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
    <div className="flex shrink-0 flex-wrap items-center gap-2 print:hidden md:flex-nowrap md:justify-end">
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
        parties={parties}
        products={products}
        documentCount={documentCount}
        openDiscrepancies={openDiscrepancies}
        openTasks={openTasks}
        auditEvents={auditEvents}
        organizationName={organizationName}
      />
      {isOwner ? (
        <ShareCollaboratorDialog shipmentId={shipmentId} className="shrink-0" />
      ) : null}
    </div>
  );
}
