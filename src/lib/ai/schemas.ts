import { z } from "zod";

export const DOCUMENT_TYPES = [
  "invoice",
  "packing_list",
  "bill_of_lading",
  "certificate",
  "import_declaration",
  "other",
] as const;

export type DocumentTypeName = (typeof DOCUMENT_TYPES)[number];

const nullableString = z.string().nullable().optional().default(null);
const nullableNumber = z.number().nullable().optional().default(null);

export const invoiceLineItemSchema = z.object({
  product: nullableString,
  description: nullableString,
  quantity: nullableNumber,
  unit: nullableString,
  unit_price: nullableNumber,
  total: nullableNumber,
});

export const invoiceExtractionSchema = z.object({
  seller: nullableString,
  buyer: nullableString,
  invoice_number: nullableString,
  invoice_date: nullableString,
  line_items: z.array(invoiceLineItemSchema).nullable().optional().default(null),
  total_value: nullableNumber,
  currency: nullableString,
  country_of_origin: nullableString,
  incoterm: nullableString,
});

export const packingListLineItemSchema = z.object({
  product: nullableString,
  description: nullableString,
  quantity: nullableNumber,
  net_weight: nullableNumber,
  gross_weight: nullableNumber,
  dimensions: nullableString,
});

export const packingListExtractionSchema = z.object({
  seller: nullableString,
  buyer: nullableString,
  packing_list_number: nullableString,
  date: nullableString,
  line_items: z.array(packingListLineItemSchema).nullable().optional().default(null),
  total_quantity: nullableNumber,
  incoterm: nullableString,
});

export const billOfLadingExtractionSchema = z.object({
  shipper: nullableString,
  consignee: nullableString,
  notify_party: nullableString,
  bill_of_lading_number: nullableString,
  vessel: nullableString,
  port_of_loading: nullableString,
  port_of_discharge: nullableString,
  date: nullableString,
  container_numbers: z.array(z.string()).nullable().optional().default(null),
  gross_weight: nullableNumber,
  description_of_goods: nullableString,
});

export const certificateExtractionSchema = z.object({
  certificate_type: nullableString,
  issuing_authority: nullableString,
  certificate_number: nullableString,
  issue_date: nullableString,
  expiry_date: nullableString,
  product: nullableString,
  country_of_origin: nullableString,
  remarks: nullableString,
});

export const importDeclarationExtractionSchema = z.object({
  declaration_number: nullableString,
  date: nullableString,
  importer: nullableString,
  exporter: nullableString,
  hs_code: nullableString,
  value: nullableNumber,
  duty_amount: nullableNumber,
  tax_amount: nullableNumber,
  status: nullableString,
});

export const otherExtractionSchema = z.object({
  document_title: nullableString,
  summary: nullableString,
  key_entities: z.array(z.string()).nullable().optional().default(null),
});

export const EXTRACTION_SCHEMAS = {
  invoice: invoiceExtractionSchema,
  packing_list: packingListExtractionSchema,
  bill_of_lading: billOfLadingExtractionSchema,
  certificate: certificateExtractionSchema,
  import_declaration: importDeclarationExtractionSchema,
  other: otherExtractionSchema,
} as const;

export const REQUIRED_FIELDS: Record<DocumentTypeName, string[]> = {
  invoice: ["seller", "buyer", "invoice_number", "total_value"],
  packing_list: ["seller", "buyer", "packing_list_number", "line_items"],
  bill_of_lading: ["shipper", "consignee", "bill_of_lading_number", "port_of_loading"],
  certificate: ["certificate_type", "certificate_number", "issue_date"],
  import_declaration: ["declaration_number", "importer", "hs_code", "value"],
  other: ["document_title"],
};

export const aiClassificationResponseSchema = z.object({
  docType: z.enum(DOCUMENT_TYPES),
  confidence: z.number().min(0).max(1),
  extractedData: z.record(z.unknown()),
});

export function validateExtractedData(
  docType: DocumentTypeName,
  data: Record<string, unknown>
): { success: true; data: Record<string, unknown> } | { success: false; error: string } {
  const schema = EXTRACTION_SCHEMAS[docType];
  if (!schema) {
    return { success: false, error: `Unknown document type: ${docType}` };
  }

  const result = schema.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
    };
  }

  return { success: true, data: result.data as Record<string, unknown> };
}

export function getSchemaJsonSchema(docType: DocumentTypeName): string {
  const fields: Record<DocumentTypeName, Record<string, string>> = {
    invoice: {
      seller: "string|null",
      buyer: "string|null",
      invoice_number: "string|null",
      invoice_date: "string|null (ISO date)",
      line_items: "[{product, description, quantity, unit, unit_price, total}]|null",
      total_value: "number|null",
      currency: "string|null",
      country_of_origin: "string|null",
      incoterm: "string|null (Incoterm 2020 code e.g. FOB, CIF, DAP)",
    },
    packing_list: {
      seller: "string|null",
      buyer: "string|null",
      packing_list_number: "string|null",
      date: "string|null (ISO date)",
      line_items: "[{product, description, quantity, net_weight, gross_weight, dimensions}]|null",
      total_quantity: "number|null",
      incoterm: "string|null (Incoterm 2020 code e.g. FOB, CIF, DAP)",
    },
    bill_of_lading: {
      shipper: "string|null",
      consignee: "string|null",
      notify_party: "string|null",
      bill_of_lading_number: "string|null",
      vessel: "string|null",
      port_of_loading: "string|null",
      port_of_discharge: "string|null",
      date: "string|null (ISO date)",
      container_numbers: "[string]|null",
      gross_weight: "number|null",
      description_of_goods: "string|null",
    },
    certificate: {
      certificate_type: "string|null",
      issuing_authority: "string|null",
      certificate_number: "string|null",
      issue_date: "string|null (ISO date)",
      expiry_date: "string|null (ISO date)",
      product: "string|null",
      country_of_origin: "string|null",
      remarks: "string|null",
    },
    import_declaration: {
      declaration_number: "string|null",
      date: "string|null (ISO date)",
      importer: "string|null",
      exporter: "string|null",
      hs_code: "string|null",
      value: "number|null",
      duty_amount: "number|null",
      tax_amount: "number|null",
      status: "string|null",
    },
    other: {
      document_title: "string|null",
      summary: "string|null",
      key_entities: "[string]|null",
    },
  };

  return JSON.stringify(fields[docType], null, 2);
}
