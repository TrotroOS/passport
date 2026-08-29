import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireShipmentPermission } from "@/lib/shipments/shipment-access";
import {
  loadUserNamesForAuditEvents,
  resolveReadinessConfirmationDetails,
} from "@/lib/shipments/readiness-confirmation";
import { buildComplianceReportDocument } from "@/lib/print/compliance-report-document";
import { buildShipmentComplianceReportHtml } from "@/lib/print/shipment-compliance-report-html";
import type {
  AuditEvent,
  Discrepancy,
  Document,
  Party,
  PassportScore,
  Product,
  RegulatoryCheckWithRegulation,
  RiskAssessment,
  Shipment,
  VerificationCheck,
  WorkflowTask,
} from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id: shipmentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await requireShipmentPermission(supabase, user.id, shipmentId, "view");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const admin = createAdminClient();

  const [
    { data: freshShipment },
    { data: scoreRow },
    { data: organization },
    { data: parties },
    { data: products },
    { data: documents },
    { data: verificationChecks },
    { data: regulatoryChecks },
    { data: allDiscrepancies },
    { data: workflowTasks },
    { data: readinessAuditEvents },
    { data: riskRow },
  ] = await Promise.all([
    admin.from("shipments").select("*").eq("id", shipmentId).single(),
    admin
      .from("passport_scores")
      .select("*")
      .eq("shipment_id", shipmentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin.from("organizations").select("name").eq("id", access.shipment.organization_id).maybeSingle(),
    admin.from("parties").select("*").eq("shipment_id", shipmentId).order("created_at"),
    admin.from("products").select("*").eq("shipment_id", shipmentId).order("created_at"),
    admin.from("documents").select("*").eq("shipment_id", shipmentId).order("created_at"),
    admin.from("verification_checks").select("*").eq("shipment_id", shipmentId).order("created_at"),
    admin
      .from("regulatory_checks")
      .select("*, regulations(*)")
      .eq("shipment_id", shipmentId)
      .order("created_at"),
    admin.from("discrepancies").select("*").eq("shipment_id", shipmentId).order("created_at"),
    admin
      .from("workflow_tasks")
      .select("*")
      .eq("shipment_id", shipmentId)
      .order("priority")
      .order("created_at", { ascending: false }),
    admin
      .from("audit_events")
      .select("*")
      .eq("shipment_id", shipmentId)
      .in("action", ["shipment.owner_confirmed_ready", "shipment.broker_confirmed_ready"])
      .order("created_at", { ascending: false }),
    admin
      .from("risk_assessments")
      .select("*")
      .eq("shipment_id", shipmentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const t = await getTranslations("print");
  const ts = await getTranslations("status");

  const shipment = (freshShipment ?? access.shipment) as Shipment;
  const readinessEvents = (readinessAuditEvents ?? []) as AuditEvent[];
  const userNamesById = await loadUserNamesForAuditEvents(admin, readinessEvents);
  const readiness = resolveReadinessConfirmationDetails(
    shipment,
    readinessEvents,
    userNamesById
  );

  const openDiscrepancies = ((allDiscrepancies ?? []) as Discrepancy[]).filter(
    (item) => item.status === "open"
  );
  const openTasks = ((workflowTasks ?? []) as WorkflowTask[]).filter(
    (task) => task.status === "open" || task.status === "in_progress"
  );

  const bodyHtml = buildShipmentComplianceReportHtml({
    shipment,
    score: (scoreRow ?? null) as PassportScore | null,
    riskAssessment: (riskRow ?? null) as RiskAssessment | null,
    parties: (parties ?? []) as Party[],
    products: (products ?? []) as Product[],
    documents: (documents ?? []) as Document[],
    verificationChecks: (verificationChecks ?? []) as VerificationCheck[],
    regulatoryChecks: (regulatoryChecks ?? []) as RegulatoryCheckWithRegulation[],
    openDiscrepancies,
    openTasks,
    organizationName: organization?.name ?? undefined,
    readiness,
    statusLabel: (status) => ts(status as "draft"),
    roleLabel: (role) => ts(role as "seller"),
    labels: {
      title: t("title"),
      tagline: t("tagline"),
      headerIntro: t("headerIntro"),
      footer: t("footer"),
      generatedAt: t("generatedAt"),
      organization: t("organization"),
      reportId: t("reportId"),
      summary: t("summary"),
      summaryIntro: t("summaryIntro"),
      shipmentRef: t("shipmentRef"),
      route: t("route"),
      status: t("status"),
      incoterm: t("incoterm"),
      passportScore: t("passportScore"),
      createdAt: t("createdAt"),
      readiness: t("readiness"),
      readinessIntro: t("readinessIntro"),
      readinessOverall: t("readinessOverall"),
      readinessComplete: t("readinessComplete"),
      readinessPending: t("readinessPending"),
      readinessRole: t("readinessRole"),
      readinessStatus: t("readinessStatus"),
      confirmedBy: t("confirmedBy"),
      confirmedAt: t("confirmedAt"),
      pending: t("pending"),
      ownerConfirmed: t("ownerConfirmed"),
      brokerConfirmed: t("brokerConfirmed"),
      yes: t("yes"),
      no: t("no"),
      scoreBreakdown: t("scoreBreakdown"),
      scoreBreakdownIntro: t("scoreBreakdownIntro"),
      documentation: t("documentation"),
      consistency: t("consistency"),
      counterparty: t("counterparty"),
      regulatory: t("regulatory"),
      riskSection: t("riskSection"),
      riskIntro: t("riskIntro"),
      riskScore: t("riskScore"),
      riskLevel: t("riskLevel"),
      partiesSection: t("partiesSection"),
      partiesIntro: t("partiesIntro"),
      partyName: t("partyName"),
      partyRole: t("partyRole"),
      partyCountry: t("partyCountry"),
      noParties: t("noParties"),
      productsSection: t("productsSection"),
      productsIntro: t("productsIntro"),
      productName: t("productName"),
      hsCode: t("hsCode"),
      noProducts: t("noProducts"),
      documentsSection: t("documentsSection"),
      documentsIntro: t("documentsIntro"),
      documentType: t("documentType"),
      documentFile: t("documentFile"),
      documentStatus: t("documentStatus"),
      noDocuments: t("noDocuments"),
      verificationSection: t("verificationSection"),
      verificationIntro: t("verificationIntro"),
      checkName: t("checkName"),
      checkStatus: t("checkStatus"),
      noVerificationChecks: t("noVerificationChecks"),
      regulatorySection: t("regulatorySection"),
      regulatoryIntro: t("regulatoryIntro"),
      regulationName: t("regulationName"),
      regulatoryStatus: t("regulatoryStatus"),
      noRegulatoryChecks: t("noRegulatoryChecks"),
      discrepanciesSection: t("discrepanciesSection"),
      discrepanciesIntro: t("discrepanciesIntro"),
      noDiscrepancies: t("noDiscrepancies"),
      tasksSection: t("tasksSection"),
      tasksIntro: t("tasksIntro"),
      taskPriority: t("taskPriority"),
      noTasks: t("noTasks"),
      confidentialNote: t("confidentialNote"),
    },
  });

  const title = `${t("title")} — ${shipment.shipment_ref}`;
  const html = buildComplianceReportDocument(title, bodyHtml, {
    autoPrint: true,
    printButtonLabel: t("printReport"),
  });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Passport-Report": "compliance-v4",
    },
  });
}
