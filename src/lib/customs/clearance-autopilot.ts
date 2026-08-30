import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditEvent } from "@/lib/audit";
import { processDocument } from "@/lib/pipeline/process-document";
import { suggestHsCodes, selectHsCode } from "@/lib/hs-code/hs-code-engine";
import { isSupportedImportDestination } from "@/lib/regulatory/jurisdiction";
import { runCompliancePipeline } from "@/lib/verification/verification-engine";
import { dispatchWebhook } from "@/lib/webhooks/webhook-service";
import type { ClearanceStage, Product, ShipmentStatus } from "@/types/database";
import {
  classifyClearanceStage,
  mapClearanceStageToShipmentStatus,
  type ClearanceClassificationResult,
} from "./classify-clearance";

const AUTO_HS_CONFIDENCE_MIN = 0.85;

export interface ClearanceAutopilotOptions {
  /** Process documents stuck in pending/failed state before compliance run */
  processPendingDocuments?: boolean;
  /** Auto-select top HS suggestion when confidence meets threshold */
  autoClassifyHs?: boolean;
}

export interface ClearanceAutopilotResult {
  success: boolean;
  stage: ClearanceStage;
  reasons: string[];
  recommendedActions: string[];
  overallScore: number | null;
  regulatoryScore: number | null;
  documentsProcessed: number;
  productsClassified: number;
  error?: string;
}

async function processPendingDocuments(
  shipmentId: string,
  userId?: string
): Promise<number> {
  const admin = createAdminClient();
  const { data: documents } = await admin
    .from("documents")
    .select("id, processing_status")
    .eq("shipment_id", shipmentId)
    .in("processing_status", ["pending", "failed"]);

  let processed = 0;
  for (const doc of documents ?? []) {
    const result = await processDocument({ documentId: doc.id, userId });
    if (result.success) processed += 1;
  }
  return processed;
}

async function autoClassifyProducts(
  shipmentId: string,
  userId: string,
  enabled: boolean
): Promise<number> {
  if (!enabled) return 0;

  const admin = createAdminClient();
  const { data: products } = await admin
    .from("products")
    .select("id, hs_code, hs_code_status")
    .eq("shipment_id", shipmentId);

  let classified = 0;

  for (const row of products ?? []) {
    const product = row as Pick<Product, "id" | "hs_code" | "hs_code_status">;
    if (product.hs_code?.trim()) continue;

    try {
      const { suggestions } = await suggestHsCodes(product.id, userId);
      const top = [...suggestions].sort(
        (a, b) => (b.confidence ?? 0) - (a.confidence ?? 0)
      )[0];
      if (!top || (top.confidence ?? 0) < AUTO_HS_CONFIDENCE_MIN) continue;

      await selectHsCode(product.id, top.id, userId, false);
      classified += 1;
    } catch (err) {
      console.warn("[ClearanceAutopilot] HS classify failed for product", product.id, err);
    }
  }

  return classified;
}

async function loadClassificationMetrics(shipmentId: string) {
  const admin = createAdminClient();

  const [
    { data: documents },
    { data: products },
    { count: openDiscrepancies },
    { count: criticalDiscrepancies },
    { count: pendingTasks },
    { count: failedRegulatoryChecks },
    { data: latestScore },
    { data: latestRisk },
    { data: shipment },
  ] = await Promise.all([
    admin.from("documents").select("id, processing_status").eq("shipment_id", shipmentId),
    admin.from("products").select("id, hs_code").eq("shipment_id", shipmentId),
    admin
      .from("discrepancies")
      .select("*", { count: "exact", head: true })
      .eq("shipment_id", shipmentId)
      .eq("status", "open"),
    admin
      .from("discrepancies")
      .select("*", { count: "exact", head: true })
      .eq("shipment_id", shipmentId)
      .eq("status", "open")
      .eq("severity", "critical"),
    admin
      .from("workflow_tasks")
      .select("*", { count: "exact", head: true })
      .eq("shipment_id", shipmentId)
      .neq("status", "completed"),
    admin
      .from("regulatory_checks")
      .select("*", { count: "exact", head: true })
      .eq("shipment_id", shipmentId)
      .eq("status", "failed"),
    admin
      .from("passport_scores")
      .select("overall_score, regulatory_score")
      .eq("shipment_id", shipmentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("risk_assessments")
      .select("risk_level")
      .eq("shipment_id", shipmentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("shipments")
      .select("destination_country, organization_id, status")
      .eq("id", shipmentId)
      .single(),
  ]);

  const pendingDocuments =
    documents?.filter((d) =>
      ["pending", "processing"].includes(d.processing_status ?? "")
    ).length ?? 0;

  const productsWithoutHs =
    products?.filter((p) => !p.hs_code?.trim()).length ?? 0;

  return {
    shipment,
    classification: classifyClearanceStage({
      documentCount: documents?.length ?? 0,
      pendingDocuments,
      productsTotal: products?.length ?? 0,
      productsWithoutHs,
      openDiscrepancies: openDiscrepancies ?? 0,
      criticalDiscrepancies: criticalDiscrepancies ?? 0,
      pendingTasks: pendingTasks ?? 0,
      failedRegulatoryChecks: failedRegulatoryChecks ?? 0,
      overallScore: latestScore?.overall_score ?? null,
      riskLevel: latestRisk?.risk_level ?? null,
      destinationSupported: isSupportedImportDestination(shipment?.destination_country),
    }),
    overallScore: latestScore?.overall_score ?? null,
    regulatoryScore: latestScore?.regulatory_score ?? null,
  };
}

async function persistClearanceOutcome(
  shipmentId: string,
  organizationId: string,
  userId: string | undefined,
  classification: ClearanceClassificationResult,
  metrics: {
    overallScore: number | null;
    regulatoryScore: number | null;
    documentsProcessed: number;
    productsClassified: number;
  }
): Promise<void> {
  const admin = createAdminClient();
  const nextStatus = mapClearanceStageToShipmentStatus(classification.stage);
  const summary = {
    reasons: classification.reasons,
    recommended_actions: classification.recommendedActions,
    overall_score: metrics.overallScore,
    regulatory_score: metrics.regulatoryScore,
    documents_processed: metrics.documentsProcessed,
    products_classified: metrics.productsClassified,
    updated_at: new Date().toISOString(),
  };

  const shipmentUpdate: {
    clearance_stage: ClearanceStage;
    clearance_autopilot_at: string;
    clearance_summary: typeof summary;
    status?: ShipmentStatus;
  } = {
    clearance_stage: classification.stage,
    clearance_autopilot_at: new Date().toISOString(),
    clearance_summary: summary,
  };

  if (nextStatus) {
    shipmentUpdate.status = nextStatus;
  }

  await admin.from("shipments").update(shipmentUpdate).eq("id", shipmentId);

  await writeAuditEvent(admin, {
    organizationId,
    userId,
    action: "clearance.autopilot.completed",
    entityType: "shipment",
    entityId: shipmentId,
    shipmentId,
    metadata: {
      clearance_stage: classification.stage,
      ...summary,
    },
  });

  dispatchWebhook(organizationId, "clearance.autopilot.completed", {
    shipment_id: shipmentId,
    clearance_stage: classification.stage,
    overall_score: metrics.overallScore,
    regulatory_score: metrics.regulatoryScore,
    reasons: classification.reasons,
  }).catch((err) =>
    console.error("[Webhook] clearance.autopilot.completed failed:", err)
  );
}

export async function runClearanceAutopilot(
  shipmentId: string,
  userId?: string,
  options: ClearanceAutopilotOptions = {}
): Promise<ClearanceAutopilotResult> {
  const {
    processPendingDocuments: shouldProcessDocs = true,
    autoClassifyHs = true,
  } = options;

  const admin = createAdminClient();
  const { data: shipment } = await admin
    .from("shipments")
    .select("id, organization_id, status")
    .eq("id", shipmentId)
    .single();

  if (!shipment) {
    return {
      success: false,
      stage: "blocked",
      reasons: ["Shipment not found"],
      recommendedActions: [],
      overallScore: null,
      regulatoryScore: null,
      documentsProcessed: 0,
      productsClassified: 0,
      error: "Shipment not found",
    };
  }

  await admin
    .from("shipments")
    .update({ clearance_stage: "classifying" })
    .eq("id", shipmentId);

  let documentsProcessed = 0;
  if (shouldProcessDocs && userId) {
    documentsProcessed = await processPendingDocuments(shipmentId, userId);
  }

  let productsClassified = 0;
  if (userId) {
    productsClassified = await autoClassifyProducts(
      shipmentId,
      userId,
      autoClassifyHs
    );
  }

  const pipeline = await runCompliancePipeline(shipmentId, userId);
  if (!pipeline.success) {
    const failure: ClearanceAutopilotResult = {
      success: false,
      stage: "blocked",
      reasons: [pipeline.error ?? "Compliance pipeline failed"],
      recommendedActions: ["Retry clearance autopilot after fixing document errors"],
      overallScore: pipeline.overallScore ?? null,
      regulatoryScore: pipeline.regulatoryScore ?? null,
      documentsProcessed,
      productsClassified,
      error: pipeline.error,
    };

    await persistClearanceOutcome(
      shipmentId,
      shipment.organization_id,
      userId,
      {
        stage: "blocked",
        reasons: failure.reasons,
        recommendedActions: failure.recommendedActions,
      },
      {
        overallScore: failure.overallScore,
        regulatoryScore: failure.regulatoryScore,
        documentsProcessed,
        productsClassified,
      }
    );

    return failure;
  }

  const { classification, overallScore, regulatoryScore } =
    await loadClassificationMetrics(shipmentId);

  await persistClearanceOutcome(
    shipmentId,
    shipment.organization_id,
    userId,
    classification,
    {
      overallScore,
      regulatoryScore,
      documentsProcessed,
      productsClassified,
    }
  );

  return {
    success: true,
    stage: classification.stage,
    reasons: classification.reasons,
    recommendedActions: classification.recommendedActions,
    overallScore,
    regulatoryScore,
    documentsProcessed,
    productsClassified,
  };
}
