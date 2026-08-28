import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, FileText, Package, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserProfileForUser } from "@/lib/auth/get-organization-id";
import { getShipmentForUser } from "@/lib/shipments/list-shipments";
import {
  getShipmentAccess,
  hasPermission,
  listCollaboratorsForShipment,
} from "@/lib/shipments/shipment-access";
import { AppPageShell } from "@/components/layout/app-page-shell";
import { AddPartyForm } from "@/components/shipments/add-party-form";
import { AddProductForm } from "@/components/shipments/add-product-form";
import { DocumentUploadForm } from "@/components/shipments/document-upload-form";
import { DocumentExtractionPanel } from "@/components/shipments/document-extraction-panel";
import { PassportScoreCard } from "@/components/shipments/passport-score-card";
import { DiscrepanciesPanel } from "@/components/shipments/discrepancies-panel";
import { VerificationChecksPanel } from "@/components/shipments/verification-checks-panel";
import { CompliancePanel } from "@/components/shipments/compliance-panel";
import { WorkflowTasksPanel } from "@/components/shipments/workflow-tasks-panel";
import { RiskPanel } from "@/components/shipments/risk-panel";
import { TradeGraphPanel } from "@/components/shipments/trade-graph-panel";
import { CollaboratorsPanel } from "@/components/shipments/collaborators-panel";
import { ShipmentCommentsPanel } from "@/components/shipments/shipment-comments-panel";
import { ReadinessPanel } from "@/components/shipments/readiness-panel";
import { ProductHsPanel } from "@/components/shipments/product-hs-panel";
import { HsCodeChecksPanel } from "@/components/shipments/hs-code-checks-panel";
import { ShipmentDetailActions } from "@/components/shipments/shipment-detail-actions";
import { ShipmentTrackingPanel } from "@/components/shipments/shipment-tracking-panel";
import { AuditEventList } from "@/components/audit/audit-event-list";
import { PartyScreeningPanel } from "@/components/compliance/party-screening-panel";
import { DocumentChecklistPanel } from "@/components/compliance/document-checklist-panel";
import { DutyEstimateCard } from "@/components/compliance/duty-estimate-card";
import { DataTrustPanel } from "@/components/governance/data-trust-panel";
import { getShipmentGraph } from "@/lib/graph/trade-graph";
import { buildDocumentChecklist } from "@/lib/compliance/document-checklist";
import { estimateShipmentDuty } from "@/lib/trade/duty-estimator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type {
  AuditEvent,
  Discrepancy,
  Document,
  DocumentExtraction,
  PassportScore,
  Product,
  ProductCategory,
  RegulatoryCheckWithRegulation,
  RiskAssessment,
  RiskFactor,
  VerificationCheck,
  ShipmentComment,
  ContainerDetail,
  ShipmentTrackingEvent,
  WorkflowTask,
} from "@/types/database";

interface ShipmentDetailPageProps {
  params: Promise<{ id: string }>;
}

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

export default async function ShipmentDetailPage({
  params,
}: ShipmentDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const t = await getTranslations("shipment");
  const ts = await getTranslations("status");
  const tNav = await getTranslations("nav");
  const tDash = await getTranslations("dashboard");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const profile = await getUserProfileForUser(supabase, user.id);
  const shipment = await getShipmentForUser(supabase, user.id, id);

  if (!shipment) {
    notFound();
  }

  const access = await getShipmentAccess(supabase, user.id, id);
  const isOwner = access.level === "owner";
  const isCollaborator = access.level === "collaborator";
  const canUpload = hasPermission(access, "upload");
  const canComment = hasPermission(access, "comment");
  const canEditTasks = hasPermission(access, "edit_tasks");
  const canOwnerConfirm = hasPermission(access, "owner_confirm");
  const canBrokerConfirm = hasPermission(access, "broker_confirm");

  const [{ data: ownerOrg }, collaborators, { data: comments }] = await Promise.all([
    supabase
      .from("organizations")
      .select("name")
      .eq("id", shipment.organization_id)
      .single(),
    listCollaboratorsForShipment(supabase, id),
    supabase
      .from("shipment_comments")
      .select("*, users(id, email, full_name), organizations(id, name)")
      .eq("shipment_id", id)
      .order("created_at", { ascending: true }),
  ]);

  const [{ data: parties }, { data: products }, { data: documents }, { data: auditEvents }] =
    await Promise.all([
      supabase.from("parties").select("*").eq("shipment_id", id).order("created_at"),
      supabase.from("products").select("*").eq("shipment_id", id).order("created_at"),
      supabase.from("documents").select("*").eq("shipment_id", id).order("created_at", { ascending: false }),
      supabase
        .from("audit_events")
        .select("*, users(full_name, email)")
        .eq("shipment_id", id)
        .order("created_at", { ascending: false }),
    ]);

  const documentIds = (documents ?? []).map((d) => d.id);

  const { data: allExtractions } = documentIds.length
    ? await supabase
        .from("document_extractions")
        .select("*")
        .in("document_id", documentIds)
        .order("created_at", { ascending: false })
    : { data: [] as DocumentExtraction[] };

  const extractionByDoc = new Map<string, DocumentExtraction>();
  for (const ext of allExtractions ?? []) {
    if (!extractionByDoc.has(ext.document_id)) {
      extractionByDoc.set(ext.document_id, ext as DocumentExtraction);
    }
  }

  const documentsWithExtractions = (documents ?? []).map((doc) => ({
    ...(doc as Document),
    latestExtraction: extractionByDoc.get(doc.id) ?? null,
  }));

  const [
    { data: verificationChecks },
    { data: allDiscrepancies },
    { data: passportScores },
    { data: regulatoryChecks },
    { data: workflowTasks },
    { data: productCategories },
    { data: riskFactors },
    { data: riskAssessments },
    { data: containers },
    { data: trackingEvents },
  ] = await Promise.all([
    supabase
      .from("verification_checks")
      .select("*")
      .eq("shipment_id", id)
      .order("check_type"),
    supabase
      .from("discrepancies")
      .select("*")
      .eq("shipment_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("passport_scores")
      .select("*")
      .eq("shipment_id", id)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("regulatory_checks")
      .select("*, regulations(*)")
      .eq("shipment_id", id)
      .order("created_at"),
    supabase
      .from("workflow_tasks")
      .select("*")
      .eq("shipment_id", id)
      .order("priority")
      .order("created_at", { ascending: false }),
    supabase.from("product_categories").select("*").order("name"),
    supabase.from("risk_factors").select("*").eq("shipment_id", id),
    supabase
      .from("risk_assessments")
      .select("*")
      .eq("shipment_id", id)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("container_details")
      .select("*")
      .eq("shipment_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("shipment_tracking_events")
      .select("*")
      .eq("shipment_id", id)
      .order("event_date", { ascending: false, nullsFirst: false }),
  ]);

  const tradeGraph = await getShipmentGraph(id);
  const documentChecklist = buildDocumentChecklist(
    shipment,
    (documents ?? []) as Document[]
  );
  const dutyEstimate = estimateShipmentDuty(
    (products ?? []) as Product[],
    shipment.origin_country,
    shipment.destination_country
  );

  const latestScore = (passportScores?.[0] ?? null) as PassportScore | null;
  const openDiscrepancies = ((allDiscrepancies ?? []) as Discrepancy[]).filter(
    (d) => d.status === "open"
  );
  const resolvedDiscrepancies = ((allDiscrepancies ?? []) as Discrepancy[]).filter(
    (d) => d.status === "resolved" || d.status === "ignored"
  );
  const criticalCount = openDiscrepancies.filter(
    (d) => d.severity === "critical"
  ).length;
  const failedRegulatoryCount = (
    (regulatoryChecks ?? []) as RegulatoryCheckWithRegulation[]
  ).filter((c) => c.status === "failed").length;

  const latestRiskAssessment = (riskAssessments?.[0] ?? null) as RiskAssessment | null;

  const orgName =
    profile?.organizations &&
    typeof profile.organizations === "object" &&
    "name" in profile.organizations
      ? (profile.organizations as { name: string }).name
      : undefined;

  return (
    <AppPageShell organizationName={orgName} userEmail={profile?.email}>
      <main className="no-print mx-auto w-full max-w-7xl min-w-0 overflow-x-hidden px-4 py-6 print:hidden sm:px-6 sm:py-8 lg:px-8">
        <Button variant="ghost" size="sm" asChild className="no-print mb-6 print:hidden">
          <Link href="/dashboard">
            <ArrowLeft className="me-2 h-4 w-4" />
            {tNav("backToDashboard")}
          </Link>
        </Button>

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            {isCollaborator ? (
              <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                {t("collaboratingAs")}{" "}
                <span className="font-semibold">{ts(access.role ?? "viewer")}</span>
                . {tDash("ownerOrg")}: {ownerOrg?.name ?? "—"}.
              </div>
            ) : null}
            <h1 className="truncate text-2xl font-bold tracking-tight md:whitespace-nowrap">
              {shipment.shipment_ref}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Badge variant={statusVariant(shipment.status)}>
                {ts(shipment.status as "draft")}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {shipment.origin_country ?? "—"} → {shipment.destination_country ?? "—"}
              </span>
              {shipment.incoterm ? (
                <span className="inline-flex items-center rounded-md bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-800">
                  {t("incoterm")} {shipment.incoterm}
                </span>
              ) : null}
              <span className="text-xs text-muted-foreground">
                {t("createdAt")} {formatDate(shipment.created_at)}
              </span>
            </div>
          </div>
          <ShipmentDetailActions
            shipmentId={id}
            shipment={shipment}
            score={latestScore}
            organizationName={ownerOrg?.name ?? orgName}
            isOwner={isOwner}
          />
        </div>

        <div className="mb-6 grid min-w-0 gap-6 lg:grid-cols-2">
          <ReadinessPanel
            shipmentId={id}
            ownerConfirmed={shipment.owner_confirmed_ready}
            brokerConfirmed={shipment.broker_confirmed_ready}
            canOwnerConfirm={canOwnerConfirm}
            canBrokerConfirm={canBrokerConfirm}
          />
          <CollaboratorsPanel
            shipmentId={id}
            collaborators={collaborators}
            canManage={isOwner}
          />
        </div>

        <div className="mb-6 min-w-0">
          <DataTrustPanel shipmentId={id} />
        </div>

        <div className="mb-6">
          <PassportScoreCard
            shipmentId={id}
            score={latestScore}
            criticalCount={criticalCount}
            failedRegulatoryCount={failedRegulatoryCount}
            readOnly={!isOwner}
          />
        </div>

        <div className="grid min-w-0 gap-6 lg:grid-cols-2">
          <Card className="min-w-0 overflow-hidden">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  <Users className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <CardTitle className="text-lg">{t("parties")}</CardTitle>
                </div>
                {isOwner ? <AddPartyForm shipmentId={id} /> : null}
              </div>
              <CardDescription>{t("partiesDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {parties && parties.length > 0 ? (
                <ul className="space-y-3">
                  {parties.map((party) => (
                    <li key={party.id} className="rounded-md border p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{party.name}</span>
                        <Badge variant="outline">{ts(party.role as "seller")}</Badge>
                      </div>
                      {party.country && (
                        <p className="text-sm text-muted-foreground">{party.country}</p>
                      )}
                      {party.email && (
                        <p className="text-sm text-muted-foreground">{party.email}</p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">{t("noParties")}</p>
              )}
            </CardContent>
          </Card>

          <Card className="min-w-0 overflow-hidden">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  <Package className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <CardTitle className="text-lg">{t("products")}</CardTitle>
                </div>
                {isOwner ? (
                  <AddProductForm
                    shipmentId={id}
                    categories={(productCategories ?? []) as ProductCategory[]}
                  />
                ) : null}
              </div>
              <CardDescription>{t("productsDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {products && products.length > 0 ? (
                <ul className="space-y-3">
                  {(products as Product[]).map((product) => (
                    <ProductHsPanel
                      key={product.id}
                      product={product}
                      canEdit={canUpload}
                    />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">{t("noProducts")}</p>
              )}
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <PartyScreeningPanel shipmentId={id} />
          </div>

          <DocumentChecklistPanel checklist={documentChecklist} shipmentId={id} />

          {dutyEstimate.products.length > 0 ? (
            <div className="lg:col-span-2">
              <DutyEstimateCard estimate={dutyEstimate} />
            </div>
          ) : null}

          <Card className="min-w-0 overflow-hidden lg:col-span-2">
            <CardHeader>
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                <CardTitle className="text-lg">{t("documents")}</CardTitle>
              </div>
              <CardDescription>{t("documentsDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {canUpload ? <DocumentUploadForm shipmentId={id} /> : null}
              <DocumentExtractionPanel documents={documentsWithExtractions} />
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <ShipmentTrackingPanel
              shipmentId={id}
              containers={(containers ?? []) as ContainerDetail[]}
              events={(trackingEvents ?? []) as ShipmentTrackingEvent[]}
              canManage={canUpload}
            />
          </div>

          <div className="lg:col-span-2">
            <RiskPanel
              assessment={latestRiskAssessment}
              factors={(riskFactors ?? []) as RiskFactor[]}
            />
          </div>

          {tradeGraph && (
            <div className="lg:col-span-2">
              <TradeGraphPanel graph={tradeGraph} />
            </div>
          )}

          <div className="lg:col-span-2">
            <CompliancePanel
              shipmentId={id}
              checks={(regulatoryChecks ?? []) as RegulatoryCheckWithRegulation[]}
              readOnly={!isOwner}
            />
          </div>

          <div className="lg:col-span-2">
            <WorkflowTasksPanel
              tasks={(workflowTasks ?? []) as WorkflowTask[]}
              canEditTasks={canEditTasks}
            />
          </div>

          <div className="lg:col-span-2">
            <DiscrepanciesPanel
              openDiscrepancies={openDiscrepancies}
              resolvedDiscrepancies={resolvedDiscrepancies}
            />
          </div>

          <div className="lg:col-span-2">
            <HsCodeChecksPanel
              shipmentId={id}
              products={(products ?? []) as Product[]}
            />
          </div>

          <div className="lg:col-span-2">
            <VerificationChecksPanel
              checks={(verificationChecks ?? []) as VerificationCheck[]}
            />
          </div>

          <div className="lg:col-span-2">
            <ShipmentCommentsPanel
              shipmentId={id}
              initialComments={(comments ?? []) as ShipmentComment[]}
              canComment={canComment}
            />
          </div>

          <Card className="min-w-0 overflow-hidden lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">{t("auditLog")}</CardTitle>
              <CardDescription>{t("auditDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <AuditEventList
                events={(auditEvents ?? []) as AuditEvent[]}
                emptyMessage={t("noAudit")}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </AppPageShell>
  );
}
