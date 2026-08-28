import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditEvent } from "@/lib/audit";
import { uploadShipmentDocument } from "@/lib/documents/upload-document";
import { logError } from "@/lib/logging/error-logger";
import { resolveShipmentForInbound } from "@/lib/inbound/resolve-shipment";
import {
  sendInboundResponse,
  sendUnknownSenderReply,
} from "@/lib/inbound/respond";
import {
  guessMimeType,
  validateInboundAttachment,
} from "@/lib/inbound/validate-attachment";
import type { IdentifiedUser } from "@/lib/inbound/user-lookup";
import type { IngestionSource } from "@/types/database";

export interface InboundAttachmentInput {
  fileName: string;
  mimeType?: string;
  buffer: Buffer;
}

export interface ProcessInboundMessageInput {
  channel: IngestionSource;
  senderAddress: string;
  subject?: string | null;
  bodyText?: string | null;
  attachments: InboundAttachmentInput[];
  identifiedUser: IdentifiedUser | null;
}

export interface ProcessInboundResult {
  ok: boolean;
  messageId?: string;
  shipmentId?: string;
  documentCount?: number;
  error?: string;
}

export async function processInboundMessage(
  input: ProcessInboundMessageInput
): Promise<ProcessInboundResult> {
  const admin = createAdminClient();

  if (!input.identifiedUser) {
    await logError({
      route: `/api/inbound/${input.channel}`,
      method: "POST",
      errorMessage: `Unknown inbound sender: ${input.senderAddress}`,
      severity: "warning",
      metadata: {
        channel: input.channel,
        sender: input.senderAddress,
        subject: input.subject,
      },
    });

    sendUnknownSenderReply(
      input.channel === "whatsapp" ? "whatsapp" : "email",
      input.senderAddress
    ).catch((err) =>
      console.error("[Inbound] Unknown sender reply failed:", err)
    );

    return { ok: true, error: "unknown_sender" };
  }

  const { user, organizationId } = input.identifiedUser;

  const { data: inboundMessage, error: msgError } = await admin
    .from("inbound_messages")
    .insert({
      organization_id: organizationId,
      user_id: user.id,
      channel_type: input.channel,
      sender_address: input.senderAddress,
      subject: input.subject ?? null,
      body_text: input.bodyText ?? null,
    })
    .select("id")
    .single();

  if (msgError || !inboundMessage) {
    return { ok: false, error: msgError?.message ?? "Failed to store message" };
  }

  let shipmentId: string | undefined;
  let shipmentRef = "";
  let shipmentCreated = false;
  let uploadedCount = 0;
  const errors: string[] = [];

  try {
    if (input.attachments.length === 0) {
      await admin
        .from("inbound_messages")
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          error_message: "No attachments found",
        })
        .eq("id", inboundMessage.id);

      await sendInboundResponse({
        channel: input.channel === "whatsapp" ? "whatsapp" : "email",
        recipient: input.senderAddress,
        shipmentRef: "N/A",
        shipmentId: "",
        documentCount: 0,
        shipmentCreated: false,
        processingNote:
          "No attachments were found in your message. Please attach PDF, image, or spreadsheet files and include a shipment reference (e.g. GH-IMP-2026-0042).",
      });

      return { ok: true, messageId: inboundMessage.id, documentCount: 0 };
    }

    const resolved = await resolveShipmentForInbound(
      organizationId,
      user.id,
      input.subject,
      input.bodyText
    );
    shipmentId = resolved.shipmentId;
    shipmentRef = resolved.shipmentRef;
    shipmentCreated = resolved.created;

    await admin
      .from("inbound_messages")
      .update({ shipment_id: shipmentId })
      .eq("id", inboundMessage.id);

    for (const attachment of input.attachments) {
      const mimeType = guessMimeType(attachment.fileName, attachment.mimeType);
      const validation = validateInboundAttachment(
        mimeType,
        attachment.buffer.length,
        attachment.buffer,
        attachment.fileName
      );

      if (!validation.valid) {
        errors.push(`${attachment.fileName}: ${validation.error}`);
        continue;
      }

      const uploadResult = await uploadShipmentDocument({
        shipmentId,
        organizationId,
        userId: user.id,
        file: attachment.buffer,
        fileName: attachment.fileName,
        mimeType,
        docType: "other",
        ingestionSource: input.channel,
        inboundMessageId: inboundMessage.id,
        storageSubfolder: "inbound",
      });

      if ("error" in uploadResult) {
        errors.push(`${attachment.fileName}: ${uploadResult.error}`);
        continue;
      }

      const doc = uploadResult.document;
      await admin.from("inbound_attachments").insert({
        inbound_message_id: inboundMessage.id,
        file_name: attachment.fileName,
        mime_type: mimeType,
        file_path: String(doc.file_path),
        size_bytes: attachment.buffer.length,
      });

      uploadedCount += 1;
    }

    await admin
      .from("inbound_messages")
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        error_message: errors.length ? errors.join("; ") : null,
      })
      .eq("id", inboundMessage.id);

    await writeAuditEvent(admin, {
      organizationId,
      userId: user.id,
      action: "inbound.documents.received",
      entityType: "inbound_message",
      entityId: inboundMessage.id,
      shipmentId,
      metadata: {
        channel: input.channel,
        document_count: uploadedCount,
        shipment_ref: shipmentRef,
        errors,
      },
    });

    await sendInboundResponse({
      channel: input.channel === "whatsapp" ? "whatsapp" : "email",
      recipient: input.senderAddress,
      shipmentRef,
      shipmentId,
      documentCount: uploadedCount,
      shipmentCreated,
      processingNote:
        errors.length > 0
          ? `Some attachments could not be processed: ${errors.join("; ")}`
          : undefined,
    });

    return {
      ok: true,
      messageId: inboundMessage.id,
      shipmentId,
      documentCount: uploadedCount,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await admin
      .from("inbound_messages")
      .update({
        processed: false,
        error_message: message,
      })
      .eq("id", inboundMessage.id);

    await logError({
      organizationId,
      userId: user.id,
      route: `/api/inbound/${input.channel}`,
      method: "POST",
      errorMessage: message,
      metadata: { inbound_message_id: inboundMessage.id },
    });

    return { ok: false, messageId: inboundMessage.id, error: message };
  }
}
