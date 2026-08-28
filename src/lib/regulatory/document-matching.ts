/**
 * Deterministic document type matching for regulatory compliance checks.
 */

import type { Document, DocumentExtraction } from "@/types/database";

/** Maps regulatory required_document_type to matchable aliases */
const DOC_TYPE_ALIASES: Record<string, string[]> = {
  import_declaration: [
    "import_declaration",
    "import_declaration_form",
    "idf",
    "customs_declaration",
  ],
  bill_of_lading: ["bill_of_lading", "waybill", "air_waybill", "bol"],
  fda_import_permit: [
    "fda_import_permit",
    "import_permit",
    "fda_permit",
    "permit",
  ],
  fda_registration: [
    "fda_registration",
    "registration",
    "product_registration",
  ],
  health_certificate: [
    "health_certificate",
    "sanitary_certificate",
    "phytosanitary_certificate",
  ],
  batch_certificate: ["batch_certificate", "batch_cert", "lot_certificate"],
  gmp_certificate: ["gmp_certificate", "gmp_cert", "good_manufacturing_practice"],
  epa_permit: ["epa_permit", "environmental_permit"],
  plant_quarantine_permit: [
    "plant_quarantine_permit",
    "phytosanitary_permit",
    "quarantine_permit",
  ],
  tin_registration: ["tin_registration", "tin", "tax_identification"],
  gsa_type_approval: ["gsa_type_approval", "type_approval", "gsa_approval"],
  gsa_certification: ["gsa_certification", "gsa_certificate", "gsa_cert"],
  gsa_safety_certificate: [
    "gsa_safety_certificate",
    "safety_certificate",
    "gsa_safety_cert",
  ],
  textile_import_license: [
    "textile_import_license",
    "import_license",
    "textile_license",
  ],
  certificate_of_conformity: [
    "certificate_of_conformity",
    "coc",
    "conformity_certificate",
  ],
  used_goods_inspection: ["used_goods_inspection", "used_inspection"],
  vin_verification: ["vin_verification", "vin_certificate"],
  hs_code: ["hs_code", "hs_classification"],
};

function normalizeDocType(value: string): string {
  return value.toLowerCase().replace(/[\s-]+/g, "_");
}

function getAliases(requiredType: string): string[] {
  const normalized = normalizeDocType(requiredType);
  return DOC_TYPE_ALIASES[normalized] ?? [normalized];
}

function extractionMentionsType(
  extraction: DocumentExtraction | undefined,
  aliases: string[]
): boolean {
  if (!extraction?.extracted_data) return false;

  const data = extraction.extracted_data;
  const searchFields = [
    data.document_type,
    data.doc_type,
    data.certificate_type,
    data.permit_type,
    data.document_subtype,
    data.permit_number,
    data.registration_number,
  ];

  for (const field of searchFields) {
    if (typeof field === "string") {
      const normalized = normalizeDocType(field);
      if (aliases.some((a) => normalized.includes(a) || a.includes(normalized))) {
        return true;
      }
    }
  }

  const json = JSON.stringify(data).toLowerCase();
  return aliases.some((a) => json.includes(a.replace(/_/g, " ")) || json.includes(a));
}

export interface DocumentMatchResult {
  matched: boolean;
  documentIds: string[];
  matchSource: string;
}

export function documentMatchesRequiredType(
  requiredType: string,
  documents: Document[],
  extractionsByDocId: Map<string, DocumentExtraction>
): DocumentMatchResult {
  const aliases = getAliases(requiredType);
  const matchedIds: string[] = [];
  let matchSource = "";

  for (const doc of documents) {
    const docTypes = [
      doc.doc_type,
      doc.doc_type_ai,
    ].filter(Boolean).map((t) => normalizeDocType(t!));

    for (const docType of docTypes) {
      if (aliases.includes(docType)) {
        matchedIds.push(doc.id);
        matchSource = `doc_type:${docType}`;
        break;
      }
    }

    if (matchedIds.includes(doc.id)) continue;

    // Certificate/other docs may contain permit subtypes in extraction
    if (doc.doc_type === "certificate" || doc.doc_type === "other") {
      const extraction = extractionsByDocId.get(doc.id);
      if (extractionMentionsType(extraction, aliases)) {
        matchedIds.push(doc.id);
        matchSource = "extraction_metadata";
      }
    }
  }

  return {
    matched: matchedIds.length > 0,
    documentIds: matchedIds,
    matchSource,
  };
}

export function formatDocumentTypeLabel(docType: string): string {
  return docType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
