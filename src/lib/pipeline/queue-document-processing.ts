import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  processDocument,
  type ProcessDocumentOptions,
} from "@/lib/pipeline/process-document";

export type QueueDocumentResult =
  | { queued: true }
  | { queued: false; reason: "already_processing" | "not_found" };

/** Mark a document as processing unless it is already in that state. */
export async function markDocumentProcessing(
  documentId: string
): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("documents")
    .update({ processing_status: "processing", processing_error: null })
    .eq("id", documentId)
    .neq("processing_status", "processing")
    .select("id")
    .maybeSingle();

  return Boolean(data);
}

/**
 * Run document extraction after the HTTP response completes (Next.js `after`).
 * Use from route handlers so uploads and reprocess requests return immediately.
 */
export function scheduleDocumentProcessing(
  options: ProcessDocumentOptions
): void {
  after(async () => {
    try {
      await processDocument(options);
    } catch (err) {
      console.error("[Pipeline] Background processing failed:", err);
    }
  });
}

/**
 * Queue extraction for a manual reprocess request.
 * Returns false when the document is already processing.
 */
export async function queueDocumentProcessing(
  options: ProcessDocumentOptions
): Promise<QueueDocumentResult> {
  const admin = createAdminClient();
  const { data: document } = await admin
    .from("documents")
    .select("id, processing_status")
    .eq("id", options.documentId)
    .maybeSingle();

  if (!document) {
    return { queued: false, reason: "not_found" };
  }

  if (document.processing_status === "processing") {
    return { queued: false, reason: "already_processing" };
  }

  const marked = await markDocumentProcessing(options.documentId);
  if (!marked) {
    return { queued: false, reason: "already_processing" };
  }

  scheduleDocumentProcessing(options);
  return { queued: true };
}
