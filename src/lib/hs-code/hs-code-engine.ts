import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditEvent } from "@/lib/audit";
import { requireShipmentPermission } from "@/lib/shipments/shipment-access";
import { runRiskAssessment } from "@/lib/risk/risk-engine";
import { recalculateTasks } from "@/lib/workflow/workflow-engine";
import type {
  HsCodeStatus,
  HsCodeSuggestion,
  HsCodeVerificationCheck,
  Product,
  Shipment,
} from "@/types/database";
import { callHsSuggestAI, callHsVerifyAI } from "./ai-client";
import { getLocaleForUser, getUserPreferredLanguage } from "@/lib/i18n/user-locale";
import {
  arbiterFilterSuggestions,
  arbiterValidateSelectedCode,
  isValidHsCodeFormat,
} from "./arbiter";
import { HS_ADVISORY } from "./prompts";

interface ProductContext {
  product: Product;
  shipment: Shipment;
  organizationId: string;
}

async function loadProductContext(productId: string): Promise<ProductContext | null> {
  const admin = createAdminClient();
  const { data: product } = await admin
    .from("products")
    .select("*")
    .eq("id", productId)
    .maybeSingle();

  if (!product) return null;

  const { data: shipment } = await admin
    .from("shipments")
    .select("*")
    .eq("id", product.shipment_id)
    .single();

  if (!shipment) return null;

  return {
    product: product as Product,
    shipment: shipment as Shipment,
    organizationId: shipment.organization_id,
  };
}

export async function requireProductAccess(
  supabase: SupabaseClient,
  userId: string,
  productId: string,
  permission: "view" | "upload" = "view"
) {
  const ctx = await loadProductContext(productId);
  if (!ctx) {
    return { error: "Product not found", status: 404 as const };
  }

  const access = await requireShipmentPermission(
    supabase,
    userId,
    ctx.product.shipment_id,
    permission === "upload" ? "upload" : "view"
  );

  if ("error" in access) {
    return { error: access.error, status: access.status as 403 | 404 };
  }

  return { ...ctx, access };
}

async function clearProductVerificationChecks(productId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("hs_code_verification_checks")
    .delete()
    .eq("product_id", productId);
}

async function insertVerificationCheck(
  productId: string,
  shipmentId: string,
  checkType: HsCodeVerificationCheck["check_type"],
  status: HsCodeVerificationCheck["status"],
  details: Record<string, unknown>
): Promise<HsCodeVerificationCheck> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("hs_code_verification_checks")
    .insert({
      product_id: productId,
      shipment_id: shipmentId,
      check_type: checkType,
      status,
      details,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to store HS verification check");
  }

  return data as HsCodeVerificationCheck;
}

export async function syncHsDiscrepancies(shipmentId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: checks } = await admin
    .from("hs_code_verification_checks")
    .select("*, products(name)")
    .eq("shipment_id", shipmentId)
    .in("status", ["failed", "warning", "needs_review"]);

  await admin
    .from("discrepancies")
    .delete()
    .eq("shipment_id", shipmentId)
    .eq("discrepancy_type", "hs_code_issue");

  for (const check of checks ?? []) {
    const productName =
      (check.products as { name?: string } | null)?.name ?? "Product";
    const severity =
      check.status === "failed"
        ? "critical"
        : check.status === "needs_review"
          ? "warning"
          : "warning";

    await admin.from("discrepancies").insert({
      shipment_id: shipmentId,
      discrepancy_type: "hs_code_issue",
      severity,
      description: `${productName}: ${check.check_type.replace(/_/g, " ")} — ${(check.details as { message?: string })?.message ?? check.status}`,
      values: {
        product_id: check.product_id,
        hs_check_id: check.id,
        check_type: check.check_type,
        ...(check.details as Record<string, unknown>),
      },
      status: "open",
    });
  }
}

async function closeHsCodeTasksForProduct(
  shipmentId: string,
  productName: string
): Promise<void> {
  const admin = createAdminClient();
  const title = `Verify HS Code for product: ${productName}`;
  await admin
    .from("workflow_tasks")
    .update({ status: "done", updated_at: new Date().toISOString() })
    .eq("shipment_id", shipmentId)
    .eq("task_type", "verify_hs_code")
    .eq("title", title)
    .in("status", ["open", "in_progress", "blocked"]);
}

async function refreshHsWorkflowAndRisk(
  shipmentId: string,
  userId?: string
): Promise<void> {
  await syncHsDiscrepancies(shipmentId);
  await recalculateTasks(shipmentId);
  await runRiskAssessment(shipmentId, userId);
}

function deriveHsCodeStatus(
  product: Product,
  latestCheck: HsCodeVerificationCheck | null
): HsCodeStatus {
  if (product.hs_code_status === "verified") return "verified";
  if (!product.hs_code?.trim()) return "missing";
  if (latestCheck?.status === "needs_review" || latestCheck?.status === "warning") {
    return "conflict";
  }
  if (product.hs_code_status === "suggested") return "suggested";
  return product.hs_code?.trim() ? "not_verified" : "missing";
}

export async function suggestHsCodes(
  productId: string,
  userId: string
): Promise<{ suggestions: HsCodeSuggestion[]; advisory: string }> {
  const admin = createAdminClient();
  const ctx = await loadProductContext(productId);
  if (!ctx) throw new Error("Product not found");

  const targetLanguage = await getUserPreferredLanguage(userId);

  const aiResult = await callHsSuggestAI({
    organizationId: ctx.organizationId,
    userId,
    productId,
    targetLanguage,
    productName: ctx.product.name,
    description: ctx.product.description,
    quantity: ctx.product.quantity,
    unit: ctx.product.unit,
    unitPrice: ctx.product.unit_price,
    currency: ctx.product.currency,
    countryOfOrigin: ctx.product.country_of_origin,
    originCountry: ctx.shipment.origin_country,
    destinationCountry: ctx.shipment.destination_country,
  });

  const filtered = arbiterFilterSuggestions(aiResult.suggestions);
  if (filtered.length === 0) {
    throw new Error("AI returned no valid HS code suggestions after validation");
  }

  await admin
    .from("hs_code_suggestions")
    .update({ is_selected: false })
    .eq("product_id", productId);

  const rows = filtered.map((item) => ({
    product_id: productId,
    shipment_id: ctx.product.shipment_id,
    organization_id: ctx.organizationId,
    hs_code: item.hs_code,
    description_match: item.description_match,
    confidence: item.confidence,
    source: "ai" as const,
    is_selected: false,
    created_by: userId,
  }));

  const { data: suggestions, error } = await admin
    .from("hs_code_suggestions")
    .insert(rows)
    .select();

  if (error) throw new Error(error.message);

  const nextStatus: HsCodeStatus = ctx.product.hs_code?.trim()
    ? ctx.product.hs_code_status
    : "suggested";

  await admin
    .from("products")
    .update({ hs_code_status: nextStatus })
    .eq("id", productId);

  await writeAuditEvent(admin, {
    organizationId: ctx.organizationId,
    userId,
    action: "hs_code.suggested",
    entityType: "product",
    entityId: productId,
    shipmentId: ctx.product.shipment_id,
    metadata: {
      suggestion_count: suggestions?.length ?? 0,
      top_code: filtered[0]?.hs_code,
    },
  });

  await refreshHsWorkflowAndRisk(ctx.product.shipment_id, userId);

  return {
    suggestions: (suggestions ?? []) as HsCodeSuggestion[],
    advisory: aiResult.advisory_note ?? HS_ADVISORY,
  };
}

export async function verifyHsCode(
  productId: string,
  userId?: string
): Promise<{ checks: HsCodeVerificationCheck[]; product: Product }> {
  const admin = createAdminClient();
  const ctx = await loadProductContext(productId);
  if (!ctx) throw new Error("Product not found");

  await clearProductVerificationChecks(productId);
  const checks: HsCodeVerificationCheck[] = [];

  if (!ctx.product.hs_code?.trim()) {
    const check = await insertVerificationCheck(
      productId,
      ctx.product.shipment_id,
      "missing_hs_code",
      "failed",
      {
        message: "Product has no HS code assigned",
        product_name: ctx.product.name,
      }
    );
    checks.push(check);

    await admin
      .from("products")
      .update({ hs_code_status: "missing" })
      .eq("id", productId);

    await writeAuditEvent(admin, {
      organizationId: ctx.organizationId,
      userId,
      action: "hs_code.verified",
      entityType: "product",
      entityId: productId,
      shipmentId: ctx.product.shipment_id,
      metadata: { result: "missing_hs_code" },
    });

    await refreshHsWorkflowAndRisk(ctx.product.shipment_id, userId);

    const { data: product } = await admin
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    return { checks, product: product as Product };
  }

  if (!isValidHsCodeFormat(ctx.product.hs_code)) {
    const check = await insertVerificationCheck(
      productId,
      ctx.product.shipment_id,
      "invalid_format",
      "failed",
      {
        message: "HS code format is invalid — must be 6–10 numeric digits",
        hs_code: ctx.product.hs_code,
        product_name: ctx.product.name,
      }
    );
    checks.push(check);

    await admin
      .from("products")
      .update({ hs_code_status: "conflict" })
      .eq("id", productId);

    await refreshHsWorkflowAndRisk(ctx.product.shipment_id, userId);

    const { data: product } = await admin
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    return { checks, product: product as Product };
  }

  const aiResult = await callHsVerifyAI({
    organizationId: ctx.organizationId,
    userId,
    productId,
    targetLanguage: await getLocaleForUser(userId),
    productName: ctx.product.name,
    description: ctx.product.description,
    hsCode: ctx.product.hs_code,
    originCountry: ctx.shipment.origin_country,
    destinationCountry: ctx.shipment.destination_country,
  });

  let status: HsCodeVerificationCheck["status"] = "passed";
  let checkType: HsCodeVerificationCheck["check_type"] = "requires_review";

  if (!aiResult.is_consistent || aiResult.confidence < 0.6) {
    status = aiResult.confidence < 0.4 ? "needs_review" : "warning";
    checkType = "description_mismatch";
  }

  const check = await insertVerificationCheck(
    productId,
    ctx.product.shipment_id,
    checkType,
    status,
    {
      message:
        status === "passed"
          ? "HS code appears consistent with product description"
          : "HS code may not match product description",
      reasoning: aiResult.reasoning,
      confidence: aiResult.confidence,
      suggested_code: aiResult.suggested_code ?? null,
      hs_code: ctx.product.hs_code,
      product_name: ctx.product.name,
    }
  );
  checks.push(check);

  const nextStatus: HsCodeStatus =
    status === "passed"
      ? ctx.product.hs_code_status === "verified"
        ? "verified"
        : "not_verified"
      : "conflict";

  await admin.from("products").update({ hs_code_status: nextStatus }).eq("id", productId);

  await writeAuditEvent(admin, {
    organizationId: ctx.organizationId,
    userId,
    action: "hs_code.verified",
    entityType: "product",
    entityId: productId,
    shipmentId: ctx.product.shipment_id,
    metadata: {
      status,
      confidence: aiResult.confidence,
      is_consistent: aiResult.is_consistent,
    },
  });

  await refreshHsWorkflowAndRisk(ctx.product.shipment_id, userId);

  const { data: product } = await admin
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  return { checks, product: product as Product };
}

export async function selectHsCode(
  productId: string,
  suggestionId: string,
  userId: string,
  markVerified = true
): Promise<{ product: Product; suggestion: HsCodeSuggestion }> {
  const admin = createAdminClient();
  const ctx = await loadProductContext(productId);
  if (!ctx) throw new Error("Product not found");

  const { data: suggestion } = await admin
    .from("hs_code_suggestions")
    .select("*")
    .eq("id", suggestionId)
    .eq("product_id", productId)
    .single();

  if (!suggestion) throw new Error("Suggestion not found");

  const validated = arbiterValidateSelectedCode(suggestion.hs_code);
  if (!validated.valid || !validated.normalized) {
    throw new Error(validated.error ?? "Invalid HS code");
  }

  await admin
    .from("hs_code_suggestions")
    .update({ is_selected: false })
    .eq("product_id", productId);

  await admin
    .from("hs_code_suggestions")
    .update({ is_selected: true })
    .eq("id", suggestionId);

  const { data: product, error } = await admin
    .from("products")
    .update({
      hs_code: validated.normalized,
      hs_code_status: markVerified ? "verified" : "suggested",
    })
    .eq("id", productId)
    .select()
    .single();

  if (error || !product) throw new Error(error?.message ?? "Failed to update product");

  await clearProductVerificationChecks(productId);
  await closeHsCodeTasksForProduct(ctx.product.shipment_id, ctx.product.name);

  await writeAuditEvent(admin, {
    organizationId: ctx.organizationId,
    userId,
    action: "hs_code.selected",
    entityType: "product",
    entityId: productId,
    shipmentId: ctx.product.shipment_id,
    metadata: {
      suggestion_id: suggestionId,
      hs_code: validated.normalized,
      mark_verified: markVerified,
      source: suggestion.source,
    },
  });

  await verifyHsCode(productId, userId);

  const { data: updatedSuggestion } = await admin
    .from("hs_code_suggestions")
    .select("*")
    .eq("id", suggestionId)
    .single();

  return {
    product: product as Product,
    suggestion: updatedSuggestion as HsCodeSuggestion,
  };
}

export async function getHsSuggestions(productId: string): Promise<HsCodeSuggestion[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("hs_code_suggestions")
    .select("*")
    .eq("product_id", productId)
    .order("confidence", { ascending: false });

  return (data ?? []) as HsCodeSuggestion[];
}

export async function getHsCodeChecksForShipment(
  shipmentId: string
): Promise<(HsCodeVerificationCheck & { products?: { name: string } | null })[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("hs_code_verification_checks")
    .select("*, products(name)")
    .eq("shipment_id", shipmentId)
    .order("created_at", { ascending: false });

  return (data ?? []) as (HsCodeVerificationCheck & {
    products?: { name: string } | null;
  })[];
}

export async function runHsChecksForShipment(
  shipmentId: string,
  userId?: string
): Promise<void> {
  const admin = createAdminClient();
  const { data: products } = await admin
    .from("products")
    .select("id")
    .eq("shipment_id", shipmentId);

  for (const product of products ?? []) {
    await verifyHsCode(product.id, userId);
  }
}

export { deriveHsCodeStatus, HS_ADVISORY };
