import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditEvent } from "@/lib/audit";
import { logError } from "@/lib/logging/error-logger";
import { createAIProvider, PROMPT_VERSION } from "@/lib/ai";
import { getAIConfig } from "@/lib/ai/provider";
import type { ClassificationHints } from "@/lib/ai/prompts";
import { runArbiter } from "@/lib/arbiter";
import { sentryAICall, sentryCreateSignedUrl } from "@/lib/sentry";
import { ALLOWED_MIME_TYPES } from "@/lib/utils";
import {
  buildAbbreviationLookup,
  detectAbbreviationFromFileName,
  loadDocumentAbbreviations,
} from "@/lib/trade/abbreviations";
import {
  applyIncotermToShipment,
  extractIncotermFromData,
} from "@/lib/trade/incoterms";

export interface ProcessDocumentOptions {
  documentId: string;
  userId?: string;
}

export interface ProcessDocumentResult {
  success: boolean;
  extractionId?: string;
  processingStatus: string;
  error?: string;
}

const SUPPORTED_MIMES = new Set<string>(ALLOWED_MIME_TYPES);

function inferFileName(document: {
  file_name?: string | null;
  file_path: string;
}): string | undefined {
  if (document.file_name) return document.file_name;
  const inboundMatch = document.file_path.match(/\/inbound\/[^/]+-(.+)$/);
  return inboundMatch?.[1];
}

async function buildClassificationHints(
  admin: ReturnType<typeof createAdminClient>,
  document: {
    doc_type: string;
    file_name?: string | null;
    file_path: string;
  },
  userId?: string
): Promise<ClassificationHints> {
  const abbreviations = await loadDocumentAbbreviations(admin);
  const fileName = inferFileName(document);
  const fromFile = fileName
    ? detectAbbreviationFromFileName(fileName, buildAbbreviationLookup(abbreviations))
    : {};

  const { getUserPreferredLanguage } = await import("@/lib/i18n/user-locale");
  const targetLanguage = userId ? await getUserPreferredLanguage(userId) : "en";

  return {
    uploadLabel: document.doc_type,
    fileName,
    abbreviations,
    suggestedDocType: fromFile.suggestedDocType,
    detectedAbbreviation: fromFile.abbreviation,
    targetLanguage,
  };
}

export async function processDocument(
  options: ProcessDocumentOptions
): Promise<ProcessDocumentResult> {
  const admin = createAdminClient();
  const { documentId, userId } = options;

  const { data: document, error: docError } = await admin
    .from("documents")
    .select("*, shipments(organization_id)")
    .eq("id", documentId)
    .single();

  if (docError || !document) {
    return { success: false, processingStatus: "failed", error: "Document not found" };
  }

  const organizationId =
    document.organization_id ??
    (document.shipments as { organization_id: string } | null)?.organization_id;

  if (!organizationId) {
    return { success: false, processingStatus: "failed", error: "Organization not found" };
  }

  const mimeType = document.mime_type ?? "application/octet-stream";

  if (!SUPPORTED_MIMES.has(mimeType)) {
    const msg = `Unsupported file type: ${mimeType}`;
    await markFailed(admin, documentId, organizationId, userId, document.shipment_id, msg);
    return { success: false, processingStatus: "failed", error: msg };
  }

  await admin
    .from("documents")
    .update({ processing_status: "processing", processing_error: null })
    .eq("id", documentId);

  await admin.from("arbiter_events").delete().eq("document_id", documentId);

  await writeAuditEvent(admin, {
    organizationId,
    userId: userId ?? document.uploaded_by ?? undefined,
    action: "document.extraction.started",
    entityType: "document",
    entityId: documentId,
    shipmentId: document.shipment_id,
  });

  const signedUrlResult = await sentryCreateSignedUrl(async () => {
    const { data, error } = await admin.storage
      .from("passport-documents")
      .createSignedUrl(document.file_path, 3600);
    return { data, error: error as Error | null };
  });

  if (signedUrlResult.error || !signedUrlResult.data) {
    await markFailed(
      admin,
      documentId,
      organizationId,
      userId,
      document.shipment_id,
      signedUrlResult.error?.message ?? "Failed to create signed URL"
    );
    return {
      success: false,
      processingStatus: "failed",
      error: signedUrlResult.error?.message ?? "Failed to create signed URL",
    };
  }

  const classificationHints = await buildClassificationHints(admin, document, userId);
  const provider = createAIProvider();
  const { model } = getAIConfig();

  const aiCallResult = await sentryAICall(
    () =>
      provider.classifyAndExtract(
        signedUrlResult.data!.signedUrl,
        mimeType,
        classificationHints
      ),
    async (logResult, aiData) => {
      await admin.from("ai_provider_logs").insert({
        organization_id: organizationId,
        user_id: userId ?? document.uploaded_by,
        document_id: documentId,
        provider: provider.name,
        model: aiData?.usage?.model ?? model,
        prompt_version: PROMPT_VERSION,
        input_tokens: aiData?.usage?.inputTokens ?? logResult.inputTokens,
        output_tokens: aiData?.usage?.outputTokens ?? logResult.outputTokens,
        cost: aiData?.usage?.cost ?? logResult.cost,
        latency_ms: aiData?.usage?.latencyMs ?? logResult.latencyMs,
        status: logResult.status,
        error_message: logResult.errorMessage,
      });
    },
    {
      organizationId,
      userId,
      documentId,
      provider: provider.name,
      model,
      promptVersion: PROMPT_VERSION,
    }
  );

  if (aiCallResult.error || !aiCallResult.data) {
    await logError({
      organizationId,
      userId,
      route: "/api/documents/process",
      method: "POST",
      errorMessage: aiCallResult.error?.message ?? "AI extraction failed",
      stackTrace: aiCallResult.error?.stack,
      severity: "error",
      metadata: { documentId, provider: provider.name },
    });
    await markFailed(
      admin,
      documentId,
      organizationId,
      userId,
      document.shipment_id,
      aiCallResult.error?.message
    );
    return {
      success: false,
      processingStatus: "failed",
      error: aiCallResult.error?.message ?? "AI extraction failed",
    };
  }

  const aiResult = aiCallResult.data;
  const verdict = runArbiter(
    aiResult.docType,
    aiResult.confidence,
    aiResult.extractedData
  );

  for (const event of verdict.events) {
    await admin.from("arbiter_events").insert({
      document_id: documentId,
      rule_id: event.ruleId,
      rule_description: event.ruleDescription,
      passed: event.passed,
      severity: event.severity,
      details: event.details,
    });
  }

  const processingStatus = verdict.needsHumanReview ? "needs_review" : "processed";
  const detectedAbbreviation = aiResult.detectedAbbreviation ?? null;

  await admin
    .from("documents")
    .update({
      processing_status: processingStatus,
      doc_type_ai: aiResult.docType,
      doc_type_confidence: aiResult.confidence,
      detected_abbreviation: detectedAbbreviation,
      processing_error: null,
    })
    .eq("id", documentId);

  const { data: extraction, error: extractionError } = await admin
    .from("document_extractions")
    .insert({
      document_id: documentId,
      extraction_type: aiResult.docType,
      extracted_data: {
        ...verdict.normalizedData,
        _low_confidence_fields: verdict.lowConfidenceFields,
        _validation_warnings: aiResult.validationWarnings ?? [],
        ...(detectedAbbreviation
          ? { _detected_abbreviation: detectedAbbreviation }
          : {}),
      },
      confidence: aiResult.confidence,
      is_arbiter_approved: verdict.approved,
      needs_human_review: verdict.needsHumanReview,
    })
    .select()
    .single();

  if (extractionError) {
    await markFailed(
      admin,
      documentId,
      organizationId,
      userId,
      document.shipment_id,
      extractionError.message
    );
    return { success: false, processingStatus: "failed", error: extractionError.message };
  }

  await admin
    .from("ai_provider_logs")
    .update({ extraction_id: extraction.id })
    .eq("document_id", documentId)
    .is("extraction_id", null);

  if (document.shipment_id) {
    const { writeExtractionProvenance } = await import("@/lib/governance/provenance");
    writeExtractionProvenance({
      organizationId,
      shipmentId: document.shipment_id,
      extractionId: extraction.id,
      documentId,
      extractedData: verdict.normalizedData as Record<string, unknown>,
      confidence: aiResult.confidence,
      model,
      userId,
    }).catch((err) => console.warn("[Provenance]", err));
  }

  const incoterm = extractIncotermFromData(verdict.normalizedData);
  if (incoterm && document.shipment_id) {
    await applyIncotermToShipment(admin, document.shipment_id, incoterm);
  }

  if (
    aiResult.docType === "bill_of_lading" &&
    document.shipment_id &&
    verdict.normalizedData
  ) {
    const { syncContainersFromBolExtraction } = await import(
      "@/lib/tracking/tracking-service"
    );
    syncContainersFromBolExtraction(
      document.shipment_id,
      verdict.normalizedData as Record<string, unknown>,
      userId
    ).catch((err) => {
      console.error("[Tracking] BOL container sync failed:", err);
    });
  }

  await writeAuditEvent(admin, {
    organizationId,
    userId: userId ?? document.uploaded_by ?? undefined,
    action: "document.extraction.completed",
    entityType: "document",
    entityId: documentId,
    shipmentId: document.shipment_id,
    metadata: {
      doc_type_ai: aiResult.docType,
      confidence: aiResult.confidence,
      approved: verdict.approved,
      needs_review: verdict.needsHumanReview,
      extraction_id: extraction.id,
      detected_abbreviation: detectedAbbreviation,
      incoterm,
    },
  });

  const { dispatchWebhook } = await import("@/lib/webhooks/webhook-service");
  dispatchWebhook(organizationId, "document.processed", {
    shipment_id: document.shipment_id,
    document_id: documentId,
    extraction_id: extraction.id,
    processing_status: processingStatus,
    doc_type_ai: aiResult.docType,
  }).catch((err) => console.error("[Webhook] document.processed failed:", err));

  if (document.shipment_id) {
    await admin
      .from("shipments")
      .update({ status: "documents_uploaded" })
      .eq("id", document.shipment_id)
      .in("status", ["draft"]);

    const { runClearanceAutopilot } = await import("@/lib/customs/clearance-autopilot");
    runClearanceAutopilot(document.shipment_id, userId, {
      processPendingDocuments: false,
      autoClassifyHs: true,
    }).catch((err) => {
      console.error("[ClearanceAutopilot] Auto-run failed:", err);
    });
  }

  return {
    success: true,
    extractionId: extraction.id,
    processingStatus,
  };
}

async function markFailed(
  admin: ReturnType<typeof createAdminClient>,
  documentId: string,
  organizationId: string,
  userId: string | undefined,
  shipmentId: string,
  errorMessage?: string
) {
  await admin
    .from("documents")
    .update({
      processing_status: "failed",
      processing_error: errorMessage ?? "Processing failed",
    })
    .eq("id", documentId);

  await writeAuditEvent(admin, {
    organizationId,
    userId,
    action: "document.extraction.failed",
    entityType: "document",
    entityId: documentId,
    shipmentId,
    metadata: { error: errorMessage },
  });

  await logError({
    organizationId,
    userId,
    route: "/api/documents/process",
    method: "POST",
    errorMessage: errorMessage ?? "Processing failed",
    severity: "error",
    metadata: { documentId, shipmentId },
  });

  const { dispatchWebhook } = await import("@/lib/webhooks/webhook-service");
  dispatchWebhook(organizationId, "document.processed", {
    shipment_id: shipmentId,
    document_id: documentId,
    processing_status: "failed",
    error: errorMessage ?? "Processing failed",
  }).catch((err) => console.error("[Webhook] document.processed failed:", err));
}
