import { WEBHOOK_EVENTS, type WebhookEventType } from "@/lib/webhooks/webhook-service";

export interface WebhookEventCatalogEntry {
  event: WebhookEventType;
  description: string;
  payload_hint: string;
}

export const WEBHOOK_EVENT_CATALOG: WebhookEventCatalogEntry[] = [
  {
    event: "shipment.created",
    description: "A new shipment was created in your organization.",
    payload_hint: "shipment_id, shipment_ref, status",
  },
  {
    event: "shipment.updated",
    description: "Shipment metadata or status changed.",
    payload_hint: "shipment_id, changed fields",
  },
  {
    event: "document.uploaded",
    description: "A document was uploaded to a shipment.",
    payload_hint: "document_id, doc_type, file_name",
  },
  {
    event: "document.processed",
    description: "Document extraction finished (processed, needs_review, or failed).",
    payload_hint: "document_id, extraction_id, processing_status, doc_type_ai, error",
  },
  {
    event: "verification.completed",
    description: "Cross-document verification finished.",
    payload_hint: "shipment_id, check counts, passport_score",
  },
  {
    event: "regulatory.completed",
    description: "Regulatory checks finished for a shipment.",
    payload_hint: "shipment_id, pass/fail summary",
  },
  {
    event: "risk.completed",
    description: "Risk assessment was generated or updated.",
    payload_hint: "shipment_id, risk_level, score",
  },
  {
    event: "workflow.task_updated",
    description: "A workflow task status or assignment changed.",
    payload_hint: "task_id, title, status",
  },
  {
    event: "clearance.autopilot.completed",
    description: "Customs clearance autopilot finished classifying a shipment.",
    payload_hint: "shipment_id, clearance_stage, overall_score, reasons",
  },
];

export function isWebhookEvent(value: string): value is WebhookEventType {
  return (WEBHOOK_EVENTS as readonly string[]).includes(value);
}
