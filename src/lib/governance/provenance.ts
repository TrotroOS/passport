import { createAdminClient } from "@/lib/supabase/admin";
import type { DataProvenanceEvent } from "@/types/database";

export interface WriteProvenanceParams {
  organizationId: string;
  shipmentId?: string;
  entityType: string;
  entityId: string;
  sourceId: string;
  fieldPath?: string;
  valueSnapshot?: unknown;
  sourceRecordRef?: string;
  confidence?: number;
  transformation?: string;
  recordedBy?: string;
  metadata?: Record<string, unknown>;
}

/** Record an immutable provenance event (best-effort — skips if table missing). */
export async function writeProvenanceEvent(
  params: WriteProvenanceParams
): Promise<DataProvenanceEvent | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("data_provenance_events")
    .insert({
      organization_id: params.organizationId,
      shipment_id: params.shipmentId ?? null,
      entity_type: params.entityType,
      entity_id: params.entityId,
      field_path: params.fieldPath ?? null,
      value_snapshot: params.valueSnapshot ?? null,
      source_id: params.sourceId,
      source_record_ref: params.sourceRecordRef ?? null,
      confidence: params.confidence ?? null,
      transformation: params.transformation ?? null,
      recorded_by: params.recordedBy ?? null,
      metadata: params.metadata ?? {},
    })
    .select()
    .single();

  if (error) {
    console.warn("[Provenance] write skipped:", error.message);
    return null;
  }

  return data as DataProvenanceEvent;
}

/** Log AI extraction provenance for key fields. */
export async function writeExtractionProvenance(params: {
  organizationId: string;
  shipmentId: string;
  extractionId: string;
  documentId: string;
  extractedData: Record<string, unknown>;
  confidence: number;
  model?: string;
  userId?: string;
}): Promise<void> {
  const skipKeys = new Set([
    "_low_confidence_fields",
    "_validation_warnings",
    "_detected_abbreviation",
    "_doc_type",
    "_normalized_at",
  ]);

  await writeProvenanceEvent({
    organizationId: params.organizationId,
    shipmentId: params.shipmentId,
    entityType: "document_extraction",
    entityId: params.extractionId,
    sourceId: "openai",
    confidence: params.confidence,
    transformation: "ai_extraction",
    recordedBy: params.userId,
    metadata: { document_id: params.documentId, model: params.model },
  });

  await writeProvenanceEvent({
    organizationId: params.organizationId,
    shipmentId: params.shipmentId,
    entityType: "document_extraction",
    entityId: params.extractionId,
    sourceId: "passport-arbiter",
    confidence: params.confidence,
    transformation: "arbiter_normalization",
    recordedBy: params.userId,
    metadata: { document_id: params.documentId },
  });

  const topFields = Object.entries(params.extractedData)
    .filter(([k]) => !skipKeys.has(k) && !k.startsWith("_"))
    .slice(0, 8);

  for (const [fieldPath, value] of topFields) {
    await writeProvenanceEvent({
      organizationId: params.organizationId,
      shipmentId: params.shipmentId,
      entityType: "document_extraction",
      entityId: params.extractionId,
      fieldPath,
      valueSnapshot: value,
      sourceId: "openai",
      confidence: params.confidence,
      transformation: "field_extract",
      recordedBy: params.userId,
      metadata: { document_id: params.documentId },
    });
  }
}

/** Log human confirmation overrides. */
export async function writeHumanOverrideProvenance(params: {
  organizationId: string;
  shipmentId: string;
  extractionId: string;
  documentId: string;
  confirmedData: Record<string, unknown>;
  previousData: Record<string, unknown>;
  userId: string;
}): Promise<void> {
  let overrideCount = 0;
  for (const [fieldPath, value] of Object.entries(params.confirmedData)) {
    if (fieldPath.startsWith("_")) continue;
    const prev = params.previousData[fieldPath];
    if (JSON.stringify(prev) !== JSON.stringify(value)) {
      overrideCount++;
      await writeProvenanceEvent({
        organizationId: params.organizationId,
        shipmentId: params.shipmentId,
        entityType: "document_extraction",
        entityId: params.extractionId,
        fieldPath,
        valueSnapshot: value,
        sourceId: "human-analyst",
        confidence: 1,
        transformation: "human_override",
        recordedBy: params.userId,
        metadata: { document_id: params.documentId, previous_value: prev },
      });
    }
  }

  if (overrideCount === 0) {
    await writeProvenanceEvent({
      organizationId: params.organizationId,
      shipmentId: params.shipmentId,
      entityType: "document_extraction",
      entityId: params.extractionId,
      sourceId: "human-analyst",
      confidence: 1,
      transformation: "human_confirm",
      recordedBy: params.userId,
      metadata: { document_id: params.documentId },
    });
  }
}
