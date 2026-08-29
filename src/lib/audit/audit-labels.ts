const ACTION_LABELS: Record<string, string> = {
  "user.login": "User signed in",
  "user.registered": "User registered",
  "organization.created": "Organization created",
  "shipment.created": "Shipment created",
  "shipment.updated": "Shipment updated",
  "shipment.owner_confirmed_ready": "Owner confirmed clearance readiness",
  "shipment.broker_confirmed_ready": "Broker confirmed clearance readiness",
  "party.created": "Party added",
  "party.screening_match": "Party screening match flagged",
  "product.created": "Product added",
  "document.uploaded": "Document uploaded",
  "document.extraction.started": "Document extraction started",
  "document.extraction.completed": "Document extraction completed",
  "document.extraction.failed": "Document extraction failed",
  "document.extraction.confirmed": "Document extraction confirmed",
  "collaborator.document_uploaded": "Collaborator uploaded document",
  "collaborator.invited": "Collaborator invited",
  "collaborator.invitation_viewed": "Collaboration invite link opened",
  "collaborator.accepted": "Collaboration invitation accepted",
  "collaborator.declined": "Collaboration invitation declined",
  "collaborator.revoked": "Collaborator access revoked",
  "collaborator.comment_added": "Comment added",
  "verification.completed": "Verification checks completed",
  "passport_score.calculated": "Passport score calculated",
  "regulatory.completed": "Regulatory checks completed",
  "risk.completed": "Risk assessment completed",
  "discrepancy.resolved": "Discrepancy resolved",
  "discrepancy.ignored": "Discrepancy ignored",
  "workflow_task.status_updated": "Workflow task updated",
  "hs_code.suggested": "HS code suggestions generated",
  "hs_code.verified": "HS code verified",
  "hs_code.selected": "HS code selected",
  "tracking.container_added": "Container added for tracking",
  "tracking.events_refreshed": "Tracking events refreshed",
  "inbound.documents.received": "Inbound documents received",
  "admin.promoted": "User promoted to admin",
  "admin.demoted": "User demoted from admin",
  "audit.exported": "Audit pack exported",
};

const ENTITY_LABELS: Record<string, string> = {
  user: "User",
  organization: "Organization",
  shipment: "Shipment",
  party: "Party",
  product: "Product",
  document: "Document",
  discrepancy: "Discrepancy",
  verification_check: "Verification check",
  workflow_task: "Workflow task",
  collaborator: "Collaborator",
  invitation: "Invitation",
  comment: "Comment",
  regulatory_check: "Regulatory check",
  risk_assessment: "Risk assessment",
  passport_score: "Passport score",
  hs_code: "HS code",
  container: "Container",
  tracking_event: "Tracking event",
};

function titleCase(value: string): string {
  return value
    .replace(/[._-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatAuditAction(action: string): string {
  return ACTION_LABELS[action] ?? titleCase(action);
}

export function formatAuditEntityType(entityType: string): string {
  return ENTITY_LABELS[entityType] ?? titleCase(entityType);
}

export function formatAuditTimestamp(iso: string, timeZone = "UTC"): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone,
  }).format(new Date(iso));
}

export function formatAuditExportId(shipmentRef: string, exportedAt: Date): string {
  const stamp = exportedAt.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const safeRef = shipmentRef.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 12);
  return `PP-AUD-${safeRef || "SHIP"}-${stamp}`;
}
