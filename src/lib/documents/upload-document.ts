import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditEvent } from "@/lib/audit";
import { scheduleDocumentProcessing } from "@/lib/pipeline/queue-document-processing";
import { dispatchWebhook } from "@/lib/webhooks/webhook-service";
import type { DocumentType, IngestionSource } from "@/types/database";

export interface UploadDocumentInput {
  shipmentId: string;
  organizationId: string;
  userId?: string;
  file: File | Buffer;
  fileName: string;
  mimeType: string;
  docType: DocumentType;
  ingestionSource?: IngestionSource;
  inboundMessageId?: string;
  /** Store under {org}/{shipment}/inbound/{documentId}-{fileName} */
  storageSubfolder?: "inbound";
  uploadedByCollaborator?: boolean;
}

export async function uploadShipmentDocument(
  input: UploadDocumentInput
): Promise<{ document: Record<string, unknown> } | { error: string }> {
  const admin = createAdminClient();
  const documentId = randomUUID();
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath =
    input.storageSubfolder === "inbound"
      ? `${input.organizationId}/${input.shipmentId}/inbound/${documentId}-${safeName}`
      : `${input.organizationId}/${input.shipmentId}/${documentId}`;

  const buffer =
    input.file instanceof Buffer
      ? input.file
      : Buffer.from(await (input.file as File).arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from("passport-documents")
    .upload(filePath, buffer, {
      contentType: input.mimeType,
      upsert: false,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data: document, error: docError } = await admin
    .from("documents")
    .insert({
      id: documentId,
      shipment_id: input.shipmentId,
      organization_id: input.organizationId,
      doc_type: input.docType,
      file_path: filePath,
      file_name: input.fileName,
      mime_type: input.mimeType,
      uploaded_by: input.userId ?? null,
      uploaded_by_collaborator: input.uploadedByCollaborator ?? false,
      ingestion_source: input.ingestionSource ?? "manual",
      inbound_message_id: input.inboundMessageId ?? null,
    })
    .select()
    .single();

  if (docError || !document) {
    await admin.storage.from("passport-documents").remove([filePath]);
    return { error: docError?.message ?? "Failed to save document record" };
  }

  await writeAuditEvent(admin, {
    organizationId: input.organizationId,
    userId: input.userId,
    action: "document.uploaded",
    entityType: "document",
    entityId: document.id,
    shipmentId: input.shipmentId,
    metadata: {
      doc_type: document.doc_type,
      file_name: input.fileName,
      mime_type: input.mimeType,
      ingestion_source: input.ingestionSource ?? "manual",
    },
  });

  dispatchWebhook(input.organizationId, "document.uploaded", {
    shipment_id: input.shipmentId,
    document_id: document.id,
    doc_type: document.doc_type,
  }).catch((err) => console.error("[Webhook] document.uploaded failed:", err));

  scheduleDocumentProcessing({
    documentId: document.id,
    userId: input.userId,
  });

  return { document };
}
