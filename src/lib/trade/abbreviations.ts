import type { createAdminClient } from "@/lib/supabase/admin";
import type { DocumentTypeName } from "@/lib/ai/schemas";

type AdminClient = ReturnType<typeof createAdminClient>;

export interface DocumentAbbreviation {
  abbreviation: string;
  canonical_doc_type: string;
  description: string | null;
  is_active?: boolean;
}

/** Fallback when DB is unavailable (matches migration seed). */
export const DEFAULT_DOCUMENT_ABBREVIATIONS: DocumentAbbreviation[] = [
  { abbreviation: "CI", canonical_doc_type: "invoice", description: "Commercial Invoice" },
  { abbreviation: "PL", canonical_doc_type: "packing_list", description: "Packing List" },
  { abbreviation: "BL", canonical_doc_type: "bill_of_lading", description: "Bill of Lading" },
  { abbreviation: "HBL", canonical_doc_type: "bill_of_lading", description: "House Bill of Lading" },
  { abbreviation: "AWB", canonical_doc_type: "bill_of_lading", description: "Air Waybill" },
  { abbreviation: "HAWB", canonical_doc_type: "bill_of_lading", description: "House Air Waybill" },
  { abbreviation: "MAWB", canonical_doc_type: "bill_of_lading", description: "Master Air Waybill" },
  { abbreviation: "COO", canonical_doc_type: "certificate", description: "Certificate of Origin" },
  { abbreviation: "COC", canonical_doc_type: "certificate", description: "Certificate of Conformity" },
  { abbreviation: "MSDS", canonical_doc_type: "other", description: "Material Safety Data Sheet" },
  { abbreviation: "POD", canonical_doc_type: "other", description: "Proof of Delivery" },
  { abbreviation: "ISF", canonical_doc_type: "other", description: "Importer Security Filing" },
  { abbreviation: "ENS", canonical_doc_type: "other", description: "Entry Summary Declaration" },
  { abbreviation: "DI", canonical_doc_type: "import_declaration", description: "Import Declaration" },
  { abbreviation: "DO", canonical_doc_type: "other", description: "Delivery Order" },
  { abbreviation: "PO", canonical_doc_type: "other", description: "Purchase Order" },
  { abbreviation: "SO", canonical_doc_type: "other", description: "Sales Order" },
];

const FILENAME_PATTERNS: { pattern: RegExp; canonical: DocumentTypeName }[] = [
  { pattern: /\bcommercial[\s_-]?invoice\b/i, canonical: "invoice" },
  { pattern: /\binvoice\b/i, canonical: "invoice" },
  { pattern: /\bpacking[\s_-]?list\b/i, canonical: "packing_list" },
  { pattern: /\bbill[\s_-]?of[\s_-]?lading\b/i, canonical: "bill_of_lading" },
  { pattern: /\bair[\s_-]?waybill\b/i, canonical: "bill_of_lading" },
  { pattern: /\bcertificate[\s_-]?of[\s_-]?origin\b/i, canonical: "certificate" },
  { pattern: /\bimport[\s_-]?declaration\b/i, canonical: "import_declaration" },
];

const CONTENT_PATTERNS: { pattern: RegExp; canonical: DocumentTypeName }[] = [
  { pattern: /\bCOMMERCIAL\s+INVOICE\b/i, canonical: "invoice" },
  { pattern: /\bBILL\s+OF\s+LADING\b/i, canonical: "bill_of_lading" },
  { pattern: /\bPACKING\s+LIST\b/i, canonical: "packing_list" },
  { pattern: /\bAIR\s+WAYBILL\b/i, canonical: "bill_of_lading" },
  { pattern: /\bCERTIFICATE\s+OF\s+ORIGIN\b/i, canonical: "certificate" },
];

function activeAbbreviations(list: DocumentAbbreviation[]): DocumentAbbreviation[] {
  return list.filter((item) => item.is_active !== false);
}

export function buildAbbreviationLookup(
  list: DocumentAbbreviation[]
): Map<string, DocumentAbbreviation> {
  const map = new Map<string, DocumentAbbreviation>();
  for (const item of activeAbbreviations(list)) {
    map.set(item.abbreviation.toUpperCase(), item);
  }
  return map;
}

export function mapAbbreviationToDocType(
  abbreviation: string,
  lookup: Map<string, DocumentAbbreviation>
): DocumentTypeName | null {
  const match = lookup.get(abbreviation.trim().toUpperCase());
  if (!match) return null;
  return match.canonical_doc_type as DocumentTypeName;
}

export function mapClassificationToCanonical(
  value: string,
  lookup: Map<string, DocumentAbbreviation>,
  validTypes: readonly string[]
): { docType: DocumentTypeName; detectedAbbreviation?: string } {
  const trimmed = value.trim();
  const upper = trimmed.toUpperCase();

  if (validTypes.includes(trimmed)) {
    return { docType: trimmed as DocumentTypeName };
  }

  const fromAbbrev = mapAbbreviationToDocType(upper, lookup);
  if (fromAbbrev) {
    return { docType: fromAbbrev, detectedAbbreviation: upper };
  }

  return { docType: "other", detectedAbbreviation: upper };
}

export function detectAbbreviationFromFileName(
  fileName: string,
  lookup: Map<string, DocumentAbbreviation>
): { abbreviation?: string; suggestedDocType?: DocumentTypeName } {
  const base = fileName.replace(/\.[^.]+$/, "");
  const tokens = base.split(/[^a-zA-Z0-9]+/).filter(Boolean);

  for (const token of tokens) {
    const upper = token.toUpperCase();
    const match = lookup.get(upper);
    if (match) {
      return {
        abbreviation: match.abbreviation,
        suggestedDocType: match.canonical_doc_type as DocumentTypeName,
      };
    }
  }

  for (const { pattern, canonical } of FILENAME_PATTERNS) {
    if (pattern.test(fileName)) {
      return { suggestedDocType: canonical };
    }
  }

  return {};
}

export function detectAbbreviationFromContent(
  content: string,
  lookup: Map<string, DocumentAbbreviation>
): { abbreviation?: string; suggestedDocType?: DocumentTypeName } {
  for (const { pattern, canonical } of CONTENT_PATTERNS) {
    if (pattern.test(content)) {
      return { suggestedDocType: canonical };
    }
  }

  const labelMatch = content.match(
    /\b(BL|HBL|AWB|HAWB|MAWB|CI|PL|COO|COC|MSDS|POD|ISF|ENS|DI|DO|PO|SO)\b(?:\s*(?:No\.?|Number|#|:))/i
  );
  if (labelMatch?.[1]) {
    const upper = labelMatch[1].toUpperCase();
    const match = lookup.get(upper);
    if (match) {
      return {
        abbreviation: match.abbreviation,
        suggestedDocType: match.canonical_doc_type as DocumentTypeName,
      };
    }
  }

  return {};
}

export async function loadDocumentAbbreviations(
  admin: AdminClient
): Promise<DocumentAbbreviation[]> {
  try {
    const { data } = await admin
      .from("document_abbreviations")
      .select("abbreviation, canonical_doc_type, description, is_active")
      .eq("is_active", true)
      .order("abbreviation");

    if (data && data.length > 0) {
      return data as DocumentAbbreviation[];
    }
  } catch {
    // fall through to defaults
  }

  return DEFAULT_DOCUMENT_ABBREVIATIONS;
}
