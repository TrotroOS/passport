import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditEvent } from "@/lib/audit";
import type {
  Document,
  DocumentExtraction,
  Product,
  Regulation,
  Shipment,
} from "@/types/database";
import {
  inferProductCategoryCode,
} from "./category-matching";
import {
  resolveDestinationJurisdiction,
} from "./jurisdiction";
import {
  documentMatchesRequiredType,
  formatDocumentTypeLabel,
} from "./document-matching";

export interface RegulatoryCheckResult {
  regulation_id: string;
  check_type: string;
  status: "passed" | "failed" | "needs_review" | "not_applicable";
  severity: "info" | "warning" | "critical";
  details: Record<string, unknown>;
}

export interface RegulatoryRunResult {
  success: boolean;
  checksCount: number;
  failedCount: number;
  regulatoryScore: number;
  error?: string;
}

interface ShipmentRegulatoryContext {
  shipment: Shipment;
  products: Product[];
  documents: Document[];
  extractionsByDocId: Map<string, DocumentExtraction>;
  categoryCodeToId: Map<string, string>;
}

async function loadRegulatoryContext(
  shipmentId: string
): Promise<ShipmentRegulatoryContext | null> {
  const admin = createAdminClient();

  const { data: shipment } = await admin
    .from("shipments")
    .select("*")
    .eq("id", shipmentId)
    .single();

  if (!shipment) return null;

  const [{ data: products }, { data: documents }, { data: categories }] =
    await Promise.all([
      admin.from("products").select("*").eq("shipment_id", shipmentId),
      admin.from("documents").select("*").eq("shipment_id", shipmentId),
      admin.from("product_categories").select("id, code"),
    ]);

  const categoryCodeToId = new Map<string, string>();
  for (const cat of categories ?? []) {
    categoryCodeToId.set(cat.code, cat.id);
  }

  const docIds = (documents ?? []).map((d) => d.id);
  const extractionsByDocId = new Map<string, DocumentExtraction>();

  if (docIds.length > 0) {
    const { data: extData } = await admin
      .from("document_extractions")
      .select("*")
      .in("document_id", docIds)
      .order("created_at", { ascending: false });

    for (const ext of extData ?? []) {
      if (!extractionsByDocId.has(ext.document_id)) {
        extractionsByDocId.set(ext.document_id, ext as DocumentExtraction);
      }
    }
  }

  return {
    shipment: shipment as Shipment,
    products: (products ?? []) as Product[],
    documents: (documents ?? []) as Document[],
    extractionsByDocId,
    categoryCodeToId,
  };
}

function resolveProductCategoryIds(ctx: ShipmentRegulatoryContext): Set<string> {
  const categoryIds = new Set<string>();

  for (const product of ctx.products) {
    if (product.product_category_id) {
      categoryIds.add(product.product_category_id);
      continue;
    }

    const inferredCode = inferProductCategoryCode(
      product.name,
      product.description
    );
    const categoryId = ctx.categoryCodeToId.get(inferredCode);
    if (categoryId) categoryIds.add(categoryId);
  }

  // Always include general consumer goods for universal rules
  const generalId = ctx.categoryCodeToId.get("general_consumer_goods");
  if (generalId) categoryIds.add(generalId);

  return categoryIds;
}

function evaluateRegulation(
  regulation: Regulation,
  ctx: ShipmentRegulatoryContext
): RegulatoryCheckResult {
  const baseDetails = {
    regulation_title: regulation.title,
    authority: regulation.authority,
    source_url: regulation.source_url,
    source_text: regulation.source_text,
    effective_date: regulation.effective_date,
    confidence: regulation.confidence,
    rule_type: regulation.rule_type,
    required_document_type: regulation.required_document_type,
  };

  // HS code check — special case
  if (regulation.required_document_type === "hs_code") {
    const productsWithoutHs = ctx.products.filter((p) => !p.hs_code?.trim());
    if (ctx.products.length === 0) {
      return {
        regulation_id: regulation.id,
        check_type: "hs_code_required",
        status: "needs_review",
        severity: "warning",
        details: {
          ...baseDetails,
          message: "No products on shipment — HS code classification cannot be verified",
        },
      };
    }
    if (productsWithoutHs.length > 0) {
      return {
        regulation_id: regulation.id,
        check_type: "hs_code_required",
        status: "failed",
        severity: "critical",
        details: {
          ...baseDetails,
          products_missing_hs_code: productsWithoutHs.map((p) => ({
            id: p.id,
            name: p.name,
          })),
        },
      };
    }
    return {
      regulation_id: regulation.id,
      check_type: "hs_code_required",
      status: "passed",
      severity: "info",
      details: {
        ...baseDetails,
        products_with_hs_code: ctx.products.length,
      },
    };
  }

  const requiredType = regulation.required_document_type;
  if (!requiredType) {
    return {
      regulation_id: regulation.id,
      check_type: regulation.rule_type,
      status: "not_applicable",
      severity: "info",
      details: baseDetails,
    };
  }

  const match = documentMatchesRequiredType(
    requiredType,
    ctx.documents,
    ctx.extractionsByDocId
  );

  const checkType =
    regulation.rule_type === "permit_required"
      ? "permit_required"
      : regulation.rule_type === "inspection_required"
        ? "inspection_required"
        : regulation.rule_type === "registration_required"
          ? "registration_required"
          : "document_present";

  if (match.matched) {
    return {
      regulation_id: regulation.id,
      check_type: checkType,
      status: "passed",
      severity: "info",
      details: {
        ...baseDetails,
        matched_document_ids: match.documentIds,
        match_source: match.matchSource,
      },
    };
  }

  const severity =
    regulation.rule_type === "permit_required" ||
    regulation.rule_type === "restriction"
      ? "critical"
      : regulation.rule_type === "document_required"
        ? "critical"
        : "warning";

  return {
    regulation_id: regulation.id,
    check_type: checkType,
    status: "failed",
    severity,
    details: {
      ...baseDetails,
      missing_document_type: requiredType,
      missing_document_label: formatDocumentTypeLabel(requiredType),
    },
  };
}

export async function getApplicableRegulations(
  shipmentId: string
): Promise<Regulation[]> {
  const ctx = await loadRegulatoryContext(shipmentId);
  if (!ctx) return [];

  if (!resolveDestinationJurisdiction(ctx.shipment.destination_country)) {
    return [];
  }

  const jurisdictionCode = resolveDestinationJurisdiction(ctx.shipment.destination_country)!;

  const admin = createAdminClient();
  const categoryIds = resolveProductCategoryIds(ctx);

  const { data: jurisdiction } = await admin
    .from("jurisdictions")
    .select("id")
    .eq("code", jurisdictionCode)
    .single();

  if (!jurisdiction) return [];

  const { data: regulations } = await admin
    .from("regulations")
    .select("*")
    .eq("jurisdiction_id", jurisdiction.id)
    .eq("is_active", true)
    .in("product_category_id", Array.from(categoryIds));

  return (regulations ?? []) as Regulation[];
}

export function runRegulatoryChecks(
  regulations: Regulation[],
  ctx: ShipmentRegulatoryContext
): RegulatoryCheckResult[] {
  if (!resolveDestinationJurisdiction(ctx.shipment.destination_country)) {
    return [];
  }

  return regulations.map((reg) => evaluateRegulation(reg, ctx));
}

export function calculateRegulatoryScore(
  checks: RegulatoryCheckResult[]
): number {
  const applicable = checks.filter((c) => c.status !== "not_applicable");
  if (applicable.length === 0) return 100;

  const passed = applicable.filter((c) => c.status === "passed").length;
  return Math.round((passed / applicable.length) * 100);
}

export async function storeRegulatoryChecks(
  shipmentId: string,
  checkResults: RegulatoryCheckResult[]
): Promise<void> {
  const admin = createAdminClient();

  await admin
    .from("regulatory_checks")
    .delete()
    .eq("shipment_id", shipmentId);

  if (checkResults.length === 0) return;

  await admin.from("regulatory_checks").insert(
    checkResults.map((check) => ({
      shipment_id: shipmentId,
      regulation_id: check.regulation_id,
      check_type: check.check_type,
      status: check.status,
      severity: check.severity,
      details: check.details,
    }))
  );
}

export async function runRegulatoryEngine(
  shipmentId: string,
  userId?: string
): Promise<RegulatoryRunResult> {
  const admin = createAdminClient();
  const ctx = await loadRegulatoryContext(shipmentId);

  if (!ctx) {
    return {
      success: false,
      checksCount: 0,
      failedCount: 0,
      regulatoryScore: 0,
      error: "Shipment not found",
    };
  }

  if (!resolveDestinationJurisdiction(ctx.shipment.destination_country)) {
    return {
      success: false,
      checksCount: 0,
      failedCount: 0,
      regulatoryScore: 0,
      error: "unsupported_corridor",
    };
  }

  const regulations = await getApplicableRegulations(shipmentId);
  const checkResults = runRegulatoryChecks(regulations, ctx);

  await storeRegulatoryChecks(shipmentId, checkResults);

  const regulatoryScore = calculateRegulatoryScore(checkResults);
  const failedCount = checkResults.filter((c) => c.status === "failed").length;

  await writeAuditEvent(admin, {
    organizationId: ctx.shipment.organization_id,
    userId,
    action: "regulatory.completed",
    entityType: "shipment",
    entityId: shipmentId,
    shipmentId,
    metadata: {
      checks_count: checkResults.length,
      failed_count: failedCount,
      regulatory_score: regulatoryScore,
      applicable_regulations: regulations.length,
    },
  });

  const { dispatchWebhook } = await import("@/lib/webhooks/webhook-service");
  dispatchWebhook(ctx.shipment.organization_id, "regulatory.completed", {
    shipment_id: shipmentId,
    checks_count: checkResults.length,
    failed_count: failedCount,
    regulatory_score: regulatoryScore,
  }).catch((err) => console.error("[Webhook] regulatory.completed failed:", err));

  return {
    success: true,
    checksCount: checkResults.length,
    failedCount,
    regulatoryScore,
  };
}

export async function updateRegulatoryScore(
  shipmentId: string
): Promise<number> {
  const admin = createAdminClient();

  const { data: checks } = await admin
    .from("regulatory_checks")
    .select("status")
    .eq("shipment_id", shipmentId);

  if (!checks || checks.length === 0) return 100;

  const applicable = checks.filter((c) => c.status !== "not_applicable");
  if (applicable.length === 0) return 100;

  const passed = applicable.filter((c) => c.status === "passed").length;
  return Math.round((passed / applicable.length) * 100);
}

export { loadRegulatoryContext, formatDocumentTypeLabel };
