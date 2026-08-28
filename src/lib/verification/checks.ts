import type { Document, DocumentExtraction } from "@/types/database";
import {
  collectDescriptions,
  descriptionsSimilar,
  namesMatch,
  percentDifference,
  sumLineItemQuantities,
} from "./matching";

export type CheckSeverity = "info" | "warning" | "critical";
export type CheckStatus = "passed" | "failed" | "warning" | "needs_review";

export interface VerificationCheckResult {
  check_id: string;
  check_type: string;
  severity: CheckSeverity;
  status: CheckStatus;
  details: Record<string, unknown>;
  document_ids: string[];
  discrepancy?: {
    discrepancy_type: string;
    severity: CheckSeverity;
    description: string;
    values: Record<string, unknown>;
  };
}

export interface ExtractedDoc {
  documentId: string;
  docType: string;
  data: Record<string, unknown>;
  extraction: DocumentExtraction;
}

export interface ShipmentVerificationContext {
  shipmentId: string;
  documents: Document[];
  extractedDocs: ExtractedDoc[];
}

const CORE_DOC_TYPES = [
  "invoice",
  "packing_list",
  "bill_of_lading",
  "import_declaration",
] as const;

export function buildVerificationContext(
  shipmentId: string,
  documents: Document[],
  extractions: DocumentExtraction[]
): ShipmentVerificationContext {
  const latestByDoc = new Map<string, DocumentExtraction>();
  for (const ext of extractions) {
    if (!latestByDoc.has(ext.document_id)) {
      latestByDoc.set(ext.document_id, ext);
    }
  }

  const extractedDocs: ExtractedDoc[] = [];
  for (const doc of documents) {
    const extraction = latestByDoc.get(doc.id);
    if (!extraction) continue;
    const docType =
      extraction.extraction_type ||
      doc.doc_type_ai ||
      doc.doc_type;
    extractedDocs.push({
      documentId: doc.id,
      docType,
      data: extraction.extracted_data,
      extraction,
    });
  }

  return { shipmentId, documents, extractedDocs };
}

function getDocByType(
  ctx: ShipmentVerificationContext,
  docType: string
): ExtractedDoc | undefined {
  return ctx.extractedDocs.find((d) => d.docType === docType);
}

function passed(
  check_id: string,
  check_type: string,
  details: Record<string, unknown> = {},
  document_ids: string[] = []
): VerificationCheckResult {
  return {
    check_id,
    check_type,
    severity: "info",
    status: "passed",
    details,
    document_ids,
  };
}

export function runDocumentCompletenessChecks(
  ctx: ShipmentVerificationContext
): VerificationCheckResult[] {
  const results: VerificationCheckResult[] = [];

  for (const docType of CORE_DOC_TYPES) {
    const doc = getDocByType(ctx, docType);
    const uploaded = ctx.documents.some(
      (d) => d.doc_type === docType || d.doc_type_ai === docType
    );

    if (doc || uploaded) {
      results.push(
        passed(`doc_present_${docType}`, "missing_document", {
          document_type: docType,
          present: true,
        }, doc ? [doc.documentId] : [])
      );
    } else {
      results.push({
        check_id: `doc_missing_${docType}`,
        check_type: "missing_document",
        severity: "warning",
        status: "failed",
        details: { document_type: docType, present: false },
        document_ids: [],
        discrepancy: {
          discrepancy_type: "missing_document",
          severity: "warning",
          description: `Missing required document: ${docType.replace(/_/g, " ")}`,
          values: { document_type: docType },
        },
      });
    }
  }

  const certDoc = getDocByType(ctx, "certificate");
  results.push({
    check_id: "certificate_presence",
    check_type: "missing_document",
    severity: "info",
    status: certDoc ? "passed" : "warning",
    details: {
      document_type: "certificate",
      present: !!certDoc,
      note: "Certificate presence noted; no score penalty applied",
    },
    document_ids: certDoc ? [certDoc.documentId] : [],
  });

  return results;
}

export function runQuantityConsistencyChecks(
  ctx: ShipmentVerificationContext
): VerificationCheckResult[] {
  const invoice = getDocByType(ctx, "invoice");
  const packingList = getDocByType(ctx, "packing_list");
  const bol = getDocByType(ctx, "bill_of_lading");

  const quantities: { source: string; value: number | null; docId: string }[] = [];

  if (invoice) {
    quantities.push({
      source: "invoice",
      value: sumLineItemQuantities(invoice.data.line_items),
      docId: invoice.documentId,
    });
  }
  if (packingList) {
    quantities.push({
      source: "packing_list",
      value:
        typeof packingList.data.total_quantity === "number"
          ? packingList.data.total_quantity
          : sumLineItemQuantities(packingList.data.line_items),
      docId: packingList.documentId,
    });
  }
  if (bol && typeof bol.data.gross_weight === "number") {
    quantities.push({
      source: "bill_of_lading_gross_weight",
      value: bol.data.gross_weight,
      docId: bol.documentId,
    });
  }

  const withValues = quantities.filter((q) => q.value !== null);
  if (withValues.length < 2) {
    return [
      {
        check_id: "quantity_consistency",
        check_type: "quantity_mismatch",
        severity: "warning",
        status: "warning",
        details: {
          message: "Insufficient quantity data across documents for comparison",
          sources: quantities.map((q) => ({ source: q.source, value: q.value })),
        },
        document_ids: quantities.map((q) => q.docId),
        discrepancy:
          withValues.length === 0
            ? undefined
            : {
                discrepancy_type: "quantity_mismatch",
                severity: "warning",
                description:
                  "Quantity data missing in one or more documents — cannot fully verify consistency",
                values: Object.fromEntries(
                  quantities.map((q) => [`${q.source}_quantity`, q.value])
                ),
              },
      },
    ];
  }

  const [first, ...rest] = withValues;
  const mismatches: Record<string, unknown>[] = [];

  for (const other of rest) {
    if (first.value === null || other.value === null) continue;
    const diff = percentDifference(first.value, other.value);
    if (diff > 0.5) {
      mismatches.push({
        source_a: first.source,
        source_b: other.source,
        value_a: first.value,
        value_b: other.value,
        percent_difference: diff,
      });
    }
  }

  if (mismatches.length > 0) {
    return [
      {
        check_id: "quantity_consistency",
        check_type: "quantity_mismatch",
        severity: "critical",
        status: "failed",
        details: { mismatches },
        document_ids: withValues.map((q) => q.docId),
        discrepancy: {
          discrepancy_type: "quantity_mismatch",
          severity: "critical",
          description: `Quantity mismatch detected (>0.5%): ${mismatches
            .map(
              (m) =>
                `${m.source_a} (${m.value_a}) vs ${m.source_b} (${m.value_b})`
            )
            .join("; ")}`,
          values: Object.fromEntries(
            withValues.map((q) => [`${q.source}_quantity`, q.value])
          ),
        },
      },
    ];
  }

  return [
    passed(
      "quantity_consistency",
      "quantity_mismatch",
      {
        quantities: Object.fromEntries(
          withValues.map((q) => [`${q.source}_quantity`, q.value])
        ),
      },
      withValues.map((q) => q.docId)
    ),
  ];
}

export function runValueConsistencyChecks(
  ctx: ShipmentVerificationContext
): VerificationCheckResult[] {
  const invoice = getDocByType(ctx, "invoice");
  const importDecl = getDocByType(ctx, "import_declaration");
  const results: VerificationCheckResult[] = [];

  if (!invoice) {
    return results;
  }

  const invoiceTotal =
    typeof invoice.data.total_value === "number"
      ? invoice.data.total_value
      : null;
  const invoiceCurrency =
    typeof invoice.data.currency === "string" ? invoice.data.currency : null;

  if (importDecl) {
    const declValue =
      typeof importDecl.data.value === "number" ? importDecl.data.value : null;

    if (invoiceTotal !== null && declValue !== null) {
      const diff = percentDifference(invoiceTotal, declValue);
      if (diff > 2) {
        results.push({
          check_id: "value_consistency_invoice_declaration",
          check_type: "value_mismatch",
          severity: "critical",
          status: "failed",
          details: {
            invoice_total: invoiceTotal,
            declaration_value: declValue,
            percent_difference: diff,
          },
          document_ids: [invoice.documentId, importDecl.documentId],
          discrepancy: {
            discrepancy_type: "value_mismatch",
            severity: "critical",
            description: `Invoice total (${invoiceTotal}) differs from import declaration value (${declValue}) by ${diff.toFixed(1)}%`,
            values: {
              invoice_total_value: invoiceTotal,
              import_declaration_value: declValue,
            },
          },
        });
      } else {
        results.push(
          passed(
            "value_consistency_invoice_declaration",
            "value_mismatch",
            { invoice_total: invoiceTotal, declaration_value: declValue },
            [invoice.documentId, importDecl.documentId]
          )
        );
      }
    }
  }

  const packingList = getDocByType(ctx, "packing_list");
  if (packingList && invoiceTotal !== null) {
    const plItems = packingList.data.line_items;
    let plTotal: number | null = null;
    if (Array.isArray(plItems)) {
      let sum = 0;
      let has = false;
      for (const item of plItems) {
        if (item && typeof item === "object") {
          const qty = (item as { quantity?: number }).quantity;
          if (typeof qty === "number") {
            sum += qty;
            has = true;
          }
        }
      }
      if (has) plTotal = sum;
    }

    if (plTotal !== null) {
      results.push(
        passed(
          "value_packing_list_quantity_note",
          "value_mismatch",
          {
            note: "Packing list has no total_value field; quantity cross-check handled separately",
            invoice_total: invoiceTotal,
          },
          [invoice.documentId, packingList.documentId]
        )
      );
    }
  }

  if (invoiceCurrency) {
    results.push(
      passed(
        "currency_present",
        "value_mismatch",
        { currency: invoiceCurrency },
        [invoice.documentId]
      )
    );
  }

  return results;
}

export function runProductDescriptionChecks(
  ctx: ShipmentVerificationContext
): VerificationCheckResult[] {
  const invoice = getDocByType(ctx, "invoice");
  const packingList = getDocByType(ctx, "packing_list");
  const bol = getDocByType(ctx, "bill_of_lading");

  if (!invoice) return [];

  const invoiceDescs = collectDescriptions(invoice.data.line_items);
  const otherDescs: { source: string; descs: string[]; docId: string }[] = [];

  if (packingList) {
    otherDescs.push({
      source: "packing_list",
      descs: collectDescriptions(packingList.data.line_items),
      docId: packingList.documentId,
    });
  }
  if (bol && typeof bol.data.description_of_goods === "string") {
    otherDescs.push({
      source: "bill_of_lading",
      descs: [bol.data.description_of_goods],
      docId: bol.documentId,
    });
  }

  if (invoiceDescs.length === 0 || otherDescs.length === 0) {
    return [
      {
        check_id: "product_description_consistency",
        check_type: "product_description_mismatch",
        severity: "warning",
        status: "warning",
        details: { message: "Insufficient product descriptions for comparison" },
        document_ids: [invoice.documentId, ...otherDescs.map((o) => o.docId)],
      },
    ];
  }

  const lowSimilarity: Record<string, unknown>[] = [];

  for (const invDesc of invoiceDescs) {
    for (const other of otherDescs) {
      for (const otherDesc of other.descs) {
        const jaccard = descriptionsSimilar(invDesc, otherDesc, 0.85);
        if (!jaccard) {
          lowSimilarity.push({
            invoice_description: invDesc,
            other_source: other.source,
            other_description: otherDesc,
          });
        }
      }
    }
  }

  if (lowSimilarity.length > 0) {
    return [
      {
        check_id: "product_description_consistency",
        check_type: "product_description_mismatch",
        severity: "warning",
        status: "warning",
        details: { low_similarity_pairs: lowSimilarity },
        document_ids: [
          invoice.documentId,
          ...otherDescs.map((o) => o.docId),
        ],
        discrepancy: {
          discrepancy_type: "product_description_mismatch",
          severity: "warning",
          description: `Product descriptions differ between invoice and other documents (${lowSimilarity.length} pair(s) below similarity threshold)`,
          values: { pairs: lowSimilarity },
        },
      },
    ];
  }

  return [
    passed(
      "product_description_consistency",
      "product_description_mismatch",
      { compared_sources: otherDescs.map((o) => o.source) },
      [invoice.documentId, ...otherDescs.map((o) => o.docId)]
    ),
  ];
}

export function runCounterpartyChecks(
  ctx: ShipmentVerificationContext
): VerificationCheckResult[] {
  const invoice = getDocByType(ctx, "invoice");
  if (!invoice) {
    return [
      {
        check_id: "counterparty_data",
        check_type: "seller_mismatch",
        severity: "info",
        status: "needs_review",
        details: { message: "No invoice available for counterparty verification" },
        document_ids: [],
      },
    ];
  }

  const results: VerificationCheckResult[] = [];
  const invoiceSeller =
    typeof invoice.data.seller === "string" ? invoice.data.seller : null;
  const invoiceBuyer =
    typeof invoice.data.buyer === "string" ? invoice.data.buyer : null;

  const bol = getDocByType(ctx, "bill_of_lading");
  const packingList = getDocByType(ctx, "packing_list");
  const importDecl = getDocByType(ctx, "import_declaration");

  if (invoiceSeller) {
    const compareTargets: { source: string; name: string | null; docId: string }[] = [];
    if (bol && typeof bol.data.shipper === "string") {
      compareTargets.push({
        source: "bill_of_lading_shipper",
        name: bol.data.shipper,
        docId: bol.documentId,
      });
    }
    if (packingList && typeof packingList.data.seller === "string") {
      compareTargets.push({
        source: "packing_list_seller",
        name: packingList.data.seller,
        docId: packingList.documentId,
      });
    }
    if (importDecl && typeof importDecl.data.exporter === "string") {
      compareTargets.push({
        source: "import_declaration_exporter",
        name: importDecl.data.exporter,
        docId: importDecl.documentId,
      });
    }

    const mismatches = compareTargets.filter(
      (t) => t.name && !namesMatch(invoiceSeller, t.name)
    );

    if (mismatches.length > 0) {
      results.push({
        check_id: "seller_consistency",
        check_type: "seller_mismatch",
        severity: "critical",
        status: "failed",
        details: {
          invoice_seller: invoiceSeller,
          mismatches: mismatches.map((m) => ({
            source: m.source,
            name: m.name,
          })),
        },
        document_ids: [
          invoice.documentId,
          ...mismatches.map((m) => m.docId),
        ],
        discrepancy: {
          discrepancy_type: "seller_mismatch",
          severity: "critical",
          description: `Seller on invoice ("${invoiceSeller}") does not match other documents`,
          values: {
            invoice_seller: invoiceSeller,
            ...Object.fromEntries(
              mismatches.map((m) => [m.source, m.name])
            ),
          },
        },
      });
    } else if (compareTargets.length > 0) {
      results.push(
        passed(
          "seller_consistency",
          "seller_mismatch",
          { invoice_seller: invoiceSeller },
          [invoice.documentId, ...compareTargets.map((t) => t.docId)]
        )
      );
    }
  }

  if (invoiceBuyer) {
    const compareTargets: { source: string; name: string | null; docId: string }[] = [];
    if (bol && typeof bol.data.consignee === "string") {
      compareTargets.push({
        source: "bill_of_lading_consignee",
        name: bol.data.consignee,
        docId: bol.documentId,
      });
    }
    if (packingList && typeof packingList.data.buyer === "string") {
      compareTargets.push({
        source: "packing_list_buyer",
        name: packingList.data.buyer,
        docId: packingList.documentId,
      });
    }
    if (importDecl && typeof importDecl.data.importer === "string") {
      compareTargets.push({
        source: "import_declaration_importer",
        name: importDecl.data.importer,
        docId: importDecl.documentId,
      });
    }

    const mismatches = compareTargets.filter(
      (t) => t.name && !namesMatch(invoiceBuyer, t.name)
    );

    if (mismatches.length > 0) {
      results.push({
        check_id: "buyer_consistency",
        check_type: "buyer_mismatch",
        severity: "warning",
        status: "warning",
        details: {
          invoice_buyer: invoiceBuyer,
          mismatches: mismatches.map((m) => ({
            source: m.source,
            name: m.name,
          })),
        },
        document_ids: [
          invoice.documentId,
          ...mismatches.map((m) => m.docId),
        ],
        discrepancy: {
          discrepancy_type: "buyer_mismatch",
          severity: "warning",
          description: `Buyer on invoice ("${invoiceBuyer}") does not match other documents`,
          values: {
            invoice_buyer: invoiceBuyer,
            ...Object.fromEntries(
              mismatches.map((m) => [m.source, m.name])
            ),
          },
        },
      });
    } else if (compareTargets.length > 0) {
      results.push(
        passed(
          "buyer_consistency",
          "buyer_mismatch",
          { invoice_buyer: invoiceBuyer },
          [invoice.documentId, ...compareTargets.map((t) => t.docId)]
        )
      );
    }
  }

  if (
    !invoiceSeller &&
    !invoiceBuyer &&
    results.length === 0
  ) {
    results.push({
      check_id: "counterparty_data",
      check_type: "seller_mismatch",
      severity: "info",
      status: "needs_review",
      details: { message: "No counterparty data available on invoice" },
      document_ids: [invoice.documentId],
    });
  }

  return results;
}

export function runExtractionQualityChecks(
  ctx: ShipmentVerificationContext
): VerificationCheckResult[] {
  const results: VerificationCheckResult[] = [];

  for (const doc of ctx.documents) {
    if (doc.processing_status === "failed") {
      results.push({
        check_id: `extraction_failed_${doc.id}`,
        check_type: "incomplete_extraction",
        severity: "critical",
        status: "failed",
        details: {
          document_id: doc.id,
          doc_type: doc.doc_type,
          error: doc.processing_error,
        },
        document_ids: [doc.id],
        discrepancy: {
          discrepancy_type: "incomplete_extraction",
          severity: "critical",
          description: `Document processing failed: ${doc.doc_type.replace(/_/g, " ")}`,
          values: {
            document_id: doc.id,
            error: doc.processing_error,
          },
        },
      });
    }
  }

  for (const extDoc of ctx.extractedDocs) {
    if (extDoc.extraction.needs_human_review) {
      results.push({
        check_id: `needs_review_${extDoc.documentId}`,
        check_type: "incomplete_extraction",
        severity: "warning",
        status: "needs_review",
        details: {
          document_id: extDoc.documentId,
          doc_type: extDoc.docType,
          confidence: extDoc.extraction.confidence,
        },
        document_ids: [extDoc.documentId],
        discrepancy: {
          discrepancy_type: "incomplete_extraction",
          severity: "warning",
          description: `Extraction for ${extDoc.docType.replace(/_/g, " ")} needs human review`,
          values: {
            document_id: extDoc.documentId,
            confidence: extDoc.extraction.confidence,
          },
        },
      });
    }
  }

  if (results.length === 0) {
    results.push(
      passed("extraction_quality", "incomplete_extraction", {
        message: "All documents processed successfully",
      })
    );
  }

  return results;
}

export function runIncotermConsistencyChecks(
  ctx: ShipmentVerificationContext
): VerificationCheckResult[] {
  const found: {
    documentId: string;
    docType: string;
    incoterm: string;
  }[] = [];

  for (const doc of ctx.extractedDocs) {
    const raw = doc.data.incoterm;
    if (typeof raw !== "string" || !raw.trim()) continue;
    found.push({
      documentId: doc.documentId,
      docType: doc.docType,
      incoterm: raw.trim().toUpperCase(),
    });
  }

  if (found.length <= 1) {
    return [
      passed("incoterm_consistency", "incoterm_mismatch", {
        incoterms_found: found.length,
      }),
    ];
  }

  const unique = new Set(found.map((item) => item.incoterm));
  if (unique.size === 1) {
    return [
      passed("incoterm_consistency", "incoterm_mismatch", {
        incoterm: Array.from(unique)[0],
        documents_checked: found.length,
      }),
    ];
  }

  return [
    {
      check_id: "incoterm_consistency",
      check_type: "incoterm_mismatch",
      severity: "warning",
      status: "warning",
      details: {
        incoterms: found,
      },
      document_ids: found.map((item) => item.documentId),
      discrepancy: {
        discrepancy_type: "incoterm_mismatch",
        severity: "warning",
        description: `Conflicting incoterms across documents: ${Array.from(unique).join(", ")}`,
        values: { incoterms: found },
      },
    },
  ];
}

export function runAllChecks(
  ctx: ShipmentVerificationContext
): VerificationCheckResult[] {
  return [
    ...runDocumentCompletenessChecks(ctx),
    ...runQuantityConsistencyChecks(ctx),
    ...runValueConsistencyChecks(ctx),
    ...runProductDescriptionChecks(ctx),
    ...runCounterpartyChecks(ctx),
    ...runIncotermConsistencyChecks(ctx),
    ...runExtractionQualityChecks(ctx),
  ];
}
