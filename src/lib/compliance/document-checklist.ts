import type { Document, Shipment } from "@/types/database";
import { resolveDestinationJurisdiction } from "@/lib/regulatory/jurisdiction";

export type ChecklistItemStatus = "complete" | "missing" | "optional";

export interface DocumentChecklistItem {
  docType: string;
  label: string;
  required: boolean;
  status: ChecklistItemStatus;
  documentId?: string;
}

export interface DocumentChecklist {
  corridor: string;
  items: DocumentChecklistItem[];
  completionPercent: number;
  requiredComplete: number;
  requiredTotal: number;
}

const DOC_LABELS: Record<string, string> = {
  invoice: "Commercial invoice",
  packing_list: "Packing list",
  bill_of_lading: "Bill of lading / AWB",
  import_declaration: "Import declaration",
  certificate: "Certificate of origin / conformity",
  other: "Supporting document",
};

/** Required docs by destination country code. */
const REQUIRED_BY_DESTINATION: Record<string, string[]> = {
  GH: ["invoice", "packing_list", "bill_of_lading", "import_declaration"],
  NG: ["invoice", "packing_list", "bill_of_lading"],
  KE: ["invoice", "packing_list", "bill_of_lading", "import_declaration"],
  DEFAULT: ["invoice", "packing_list", "bill_of_lading"],
};

/** Extra docs for specific corridors (origin->dest). */
const CORRIDOR_EXTRAS: Record<string, string[]> = {
  "CN->GH": ["certificate"],
  "AE->GH": ["certificate"],
  "US->GH": ["certificate"],
};

function destCode(country: string | null): string {
  if (!country) return "DEFAULT";
  return resolveDestinationJurisdiction(country) ?? "DEFAULT";
}

function originCode(country: string | null): string {
  if (!country) return "unknown";
  const upper = country.trim().toUpperCase();
  if (upper.length === 2) return upper;
  if (upper.includes("CHINA") || upper.startsWith("CN")) return "CN";
  if (upper.includes("UAE") || upper.includes("EMIRATES")) return "AE";
  if (upper.includes("UNITED STATES") || upper === "USA") return "US";
  return upper.slice(0, 2);
}

/** Build a document checklist for a shipment based on corridor and uploaded docs. */
export function buildDocumentChecklist(
  shipment: Pick<Shipment, "origin_country" | "destination_country" | "incoterm">,
  documents: Document[]
): DocumentChecklist {
  const dest = destCode(shipment.destination_country);
  const origin = originCode(shipment.origin_country);
  const corridor = `${origin}->${dest}`;

  const required = [
    ...(REQUIRED_BY_DESTINATION[dest] ?? REQUIRED_BY_DESTINATION.DEFAULT),
    ...(CORRIDOR_EXTRAS[corridor] ?? []),
  ];

  const uniqueRequired = [...new Set(required)];
  const uploadedByType = new Map<string, Document>();
  for (const doc of documents) {
    if (!uploadedByType.has(doc.doc_type)) {
      uploadedByType.set(doc.doc_type, doc);
    }
  }

  const items: DocumentChecklistItem[] = uniqueRequired.map((docType) => {
    const uploaded = uploadedByType.get(docType);
    return {
      docType,
      label: DOC_LABELS[docType] ?? docType.replace(/_/g, " "),
      required: true,
      status: uploaded ? "complete" : "missing",
      documentId: uploaded?.id,
    };
  });

  if (shipment.incoterm && ["CIF", "CIP", "DAP", "DDP"].includes(shipment.incoterm.toUpperCase())) {
    items.push({
      docType: "insurance_cert",
      label: "Insurance certificate",
      required: false,
      status: uploadedByType.has("certificate") ? "complete" : "optional",
    });
  }

  const requiredItems = items.filter((i) => i.required);
  const requiredComplete = requiredItems.filter((i) => i.status === "complete").length;
  const requiredTotal = requiredItems.length;
  const completionPercent =
    requiredTotal > 0 ? Math.round((requiredComplete / requiredTotal) * 100) : 0;

  return {
    corridor,
    items,
    completionPercent,
    requiredComplete,
    requiredTotal,
  };
}
