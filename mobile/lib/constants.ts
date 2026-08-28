export const SHIPMENT_STATUSES = [
  "draft",
  "documents_uploaded",
  "in_review",
  "ready",
  "blocked",
  "archived",
] as const;

export const PARTY_ROLES = [
  "seller",
  "buyer",
  "manufacturer",
  "freight_forwarder",
  "customs_broker",
  "warehouse",
  "trucker",
  "insurer",
] as const;

export const DOCUMENT_TYPES = [
  "invoice",
  "packing_list",
  "bill_of_lading",
  "certificate",
  "import_declaration",
  "other",
] as const;

export const MAX_FILE_SIZE = 20 * 1024 * 1024;
