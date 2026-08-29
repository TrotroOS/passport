import { FileText, History, Package, Users } from "lucide-react";
import { DocumentExtractionPanel } from "@/components/shipments/document-extraction-panel";
import { PassportScoreCard } from "@/components/shipments/passport-score-card";
import { DiscrepanciesPanel } from "@/components/shipments/discrepancies-panel";
import { VerificationChecksPanel } from "@/components/shipments/verification-checks-panel";
import { CompliancePanel } from "@/components/shipments/compliance-panel";
import { WorkflowTasksPanel } from "@/components/shipments/workflow-tasks-panel";
import { RiskPanel } from "@/components/shipments/risk-panel";
import { TradeGraphPanel } from "@/components/shipments/trade-graph-panel";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate, formatStatus } from "@/lib/utils";
import type { AdminShipmentDetail } from "@/lib/admin/load-shipment-detail";

function statusVariant(status: string) {
  switch (status) {
    case "ready":
      return "success" as const;
    case "blocked":
      return "destructive" as const;
    case "in_review":
      return "warning" as const;
    default:
      return "secondary" as const;
  }
}

interface AdminShipmentViewProps {
  shipmentId: string;
  detail: AdminShipmentDetail;
}

export function AdminShipmentView({ shipmentId, detail }: AdminShipmentViewProps) {
  const shipment = detail.shipment as {
    shipment_ref: string;
    status: string;
    origin_country: string | null;
    destination_country: string | null;
    created_at: string;
  };

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{detail.organizationName}</p>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {shipment.shipment_ref}
            </h1>
            <Badge variant={statusVariant(shipment.status)}>
              {formatStatus(shipment.status)}
            </Badge>
          </div>
          <p className="mt-1 text-muted-foreground">
            {shipment.origin_country ?? "—"} → {shipment.destination_country ?? "—"}
          </p>
          <p className="text-xs text-muted-foreground">Created {formatDate(shipment.created_at)}</p>
        </div>
      </div>

      <div className="mb-6">
        <PassportScoreCard
          shipmentId={shipmentId}
          score={detail.latestScore}
          criticalCount={detail.criticalCount}
          failedRegulatoryCount={detail.failedRegulatoryCount}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg text-foreground">Parties</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {detail.parties.length > 0 ? (
              <ul className="space-y-3">
                {detail.parties.map((party) => {
                  const p = party as { id: string; name: string; role: string; country?: string; email?: string };
                  return (
                    <li key={p.id} className="rounded-md border border-border p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{p.name}</span>
                        <Badge variant="outline">{formatStatus(p.role)}</Badge>
                      </div>
                      {p.country && <p className="text-sm text-muted-foreground">{p.country}</p>}
                      {p.email && <p className="text-sm text-muted-foreground">{p.email}</p>}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No parties</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg text-foreground">Products</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {detail.products.length > 0 ? (
              <ul className="space-y-3">
                {detail.products.map((product) => {
                  const p = product as { id: string; name: string; hs_code?: string; quantity?: number; unit?: string };
                  return (
                    <li key={p.id} className="rounded-md border border-border p-3">
                      <div className="font-medium text-foreground">{p.name}</div>
                      {p.hs_code && <p className="text-sm text-muted-foreground">HS: {p.hs_code}</p>}
                      {p.quantity != null && (
                        <p className="text-sm text-muted-foreground">
                          Qty: {p.quantity} {p.unit ?? ""}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No products</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg text-foreground">Documents</CardTitle>
            </div>
            <CardDescription className="text-muted-foreground">Read-only admin view</CardDescription>
          </CardHeader>
          <CardContent>
            <DocumentExtractionPanel documents={detail.documentsWithExtractions} />
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <RiskPanel assessment={detail.latestRiskAssessment} factors={detail.riskFactors} />
        </div>

        {detail.tradeGraph && (
          <div className="lg:col-span-2">
            <TradeGraphPanel graph={detail.tradeGraph} />
          </div>
        )}

        <div className="lg:col-span-2">
          <CompliancePanel
            shipmentId={shipmentId}
            checks={detail.regulatoryChecks}
            destinationCountry={shipment.destination_country}
            originCountry={shipment.origin_country}
            readOnly
          />
        </div>

        <div className="lg:col-span-2">
          <WorkflowTasksPanel tasks={detail.workflowTasks} />
        </div>

        <div className="lg:col-span-2">
          <DiscrepanciesPanel
            openDiscrepancies={detail.openDiscrepancies}
            resolvedDiscrepancies={detail.resolvedDiscrepancies}
          />
        </div>

        <div className="lg:col-span-2">
          <VerificationChecksPanel checks={detail.verificationChecks} />
        </div>

        <Card className="border-border bg-card lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg text-foreground">Audit log</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {detail.auditEvents.length > 0 ? (
              <ul className="space-y-2">
                {detail.auditEvents.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-start justify-between rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-medium text-foreground">{event.action}</span>
                      <span className="ml-2 text-muted-foreground">({event.entity_type})</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(event.created_at)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No audit events</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
