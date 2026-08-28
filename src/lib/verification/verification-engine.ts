import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditEvent } from "@/lib/audit";
import type { Document, DocumentExtraction } from "@/types/database";
import {
  buildVerificationContext,
  runAllChecks,
  type VerificationCheckResult,
} from "./checks";
import { calculatePassportScoreFromData } from "./passport-score";
import { runRegulatoryEngine } from "@/lib/regulatory/regulatory-engine";
import { recalculateTasks } from "@/lib/workflow/workflow-engine";
import { runRiskAssessment } from "@/lib/risk/risk-engine";
import { dispatchWebhook } from "@/lib/webhooks/webhook-service";

export interface VerificationRunResult {
  success: boolean;
  checksCount: number;
  discrepanciesCount: number;
  overallScore: number;
  regulatoryScore?: number;
  error?: string;
}

async function loadShipmentData(shipmentId: string) {
  const admin = createAdminClient();

  const { data: shipment } = await admin
    .from("shipments")
    .select("id, organization_id")
    .eq("id", shipmentId)
    .single();

  if (!shipment) return null;

  const { data: documents } = await admin
    .from("documents")
    .select("*")
    .eq("shipment_id", shipmentId);

  const docIds = (documents ?? []).map((d) => d.id);
  const extractions: DocumentExtraction[] = [];

  if (docIds.length > 0) {
    const { data: extData } = await admin
      .from("document_extractions")
      .select("*")
      .in("document_id", docIds)
      .order("created_at", { ascending: false });

    const seen = new Set<string>();
    for (const ext of extData ?? []) {
      if (!seen.has(ext.document_id)) {
        seen.add(ext.document_id);
        extractions.push(ext as DocumentExtraction);
      }
    }
  }

  return {
    shipment,
    documents: (documents ?? []) as Document[],
    extractions,
  };
}

export async function runVerificationChecks(
  shipmentId: string,
  userId?: string
): Promise<VerificationRunResult> {
  const admin = createAdminClient();
  const data = await loadShipmentData(shipmentId);

  if (!data) {
    return {
      success: false,
      checksCount: 0,
      discrepanciesCount: 0,
      overallScore: 0,
      error: "Shipment not found",
    };
  }

  const ctx = buildVerificationContext(
    shipmentId,
    data.documents,
    data.extractions
  );
  const checkResults = runAllChecks(ctx);

  await admin
    .from("discrepancies")
    .delete()
    .eq("shipment_id", shipmentId);

  await admin
    .from("verification_checks")
    .delete()
    .eq("shipment_id", shipmentId);

  const insertedChecks: { id: string; check_id: string }[] = [];

  for (const check of checkResults) {
    const { data: inserted, error } = await admin
      .from("verification_checks")
      .insert({
        shipment_id: shipmentId,
        check_id: check.check_id,
        check_type: check.check_type,
        severity: check.severity,
        status: check.status,
        details: check.details,
        document_ids: check.document_ids,
      })
      .select("id, check_id")
      .single();

    if (error || !inserted) continue;
    insertedChecks.push(inserted);

    if (check.discrepancy) {
      await admin.from("discrepancies").insert({
        shipment_id: shipmentId,
        verification_check_id: inserted.id,
        discrepancy_type: check.discrepancy.discrepancy_type,
        severity: check.discrepancy.severity,
        description: check.discrepancy.description,
        values: check.discrepancy.values,
        status: "open",
      });
    }
  }

  await writeAuditEvent(admin, {
    organizationId: data.shipment.organization_id,
    userId,
    action: "verification.completed",
    entityType: "shipment",
    entityId: shipmentId,
    shipmentId,
    metadata: {
      checks_count: checkResults.length,
      discrepancies_count: checkResults.filter((c) => c.discrepancy).length,
    },
  });

  dispatchWebhook(data.shipment.organization_id, "verification.completed", {
    shipment_id: shipmentId,
    checks_count: checkResults.length,
    discrepancies_count: checkResults.filter((c) => c.discrepancy).length,
  }).catch((err) => console.error("[Webhook] verification.completed failed:", err));

  const scoreResult = await calculatePassportScore(shipmentId, userId);

  return {
    success: true,
    checksCount: checkResults.length,
    discrepanciesCount: checkResults.filter((c) => c.discrepancy).length,
    overallScore: scoreResult.overallScore,
  };
}

export async function calculatePassportScore(
  shipmentId: string,
  userId?: string
): Promise<{ overallScore: number; scoreId?: string }> {
  const admin = createAdminClient();

  const { data: shipment } = await admin
    .from("shipments")
    .select("organization_id")
    .eq("id", shipmentId)
    .single();

  if (!shipment) {
    return { overallScore: 0 };
  }

  const [{ data: checks }, { data: discrepancies }, { data: regulatoryChecks }] =
    await Promise.all([
      admin
        .from("verification_checks")
        .select("*")
        .eq("shipment_id", shipmentId),
      admin.from("discrepancies").select("*").eq("shipment_id", shipmentId),
      admin
        .from("regulatory_checks")
        .select("*")
        .eq("shipment_id", shipmentId),
    ]);

  const breakdown = calculatePassportScoreFromData(
    checks ?? [],
    discrepancies ?? [],
    regulatoryChecks ?? []
  );

  const { data: scoreRecord } = await admin
    .from("passport_scores")
    .insert({
      shipment_id: shipmentId,
      overall_score: breakdown.overall_score,
      documentation_score: breakdown.documentation_score,
      consistency_score: breakdown.consistency_score,
      counterparty_score: breakdown.counterparty_score,
      regulatory_score: breakdown.regulatory_score,
      score_json: breakdown,
    })
    .select("id")
    .single();

  await writeAuditEvent(admin, {
    organizationId: shipment.organization_id,
    userId,
    action: "passport_score.calculated",
    entityType: "passport_score",
    entityId: scoreRecord?.id,
    shipmentId,
    metadata: {
      overall_score: breakdown.overall_score,
      documentation_score: breakdown.documentation_score,
      consistency_score: breakdown.consistency_score,
      counterparty_score: breakdown.counterparty_score,
      regulatory_score: breakdown.regulatory_score,
    },
  });

  return {
    overallScore: breakdown.overall_score,
    scoreId: scoreRecord?.id,
  };
}

export async function generateDiscrepancySummary(
  shipmentId: string
): Promise<string> {
  const admin = createAdminClient();

  const { data: discrepancies } = await admin
    .from("discrepancies")
    .select("*")
    .eq("shipment_id", shipmentId)
    .eq("status", "open")
    .order("severity", { ascending: true });

  if (!discrepancies || discrepancies.length === 0) {
    return "No active discrepancies. All verification checks passed or are informational.";
  }

  const critical = discrepancies.filter((d) => d.severity === "critical");
  const warnings = discrepancies.filter((d) => d.severity === "warning");

  const lines: string[] = [];

  if (critical.length > 0) {
    lines.push(
      `${critical.length} critical issue(s) require attention before shipment clearance:`
    );
    for (const d of critical) {
      lines.push(`- ${d.description}`);
    }
  }

  if (warnings.length > 0) {
    lines.push(
      `${warnings.length} warning(s) should be reviewed:`
    );
    for (const d of warnings) {
      lines.push(`- ${d.description}`);
    }
  }

  const summary = lines.join("\n");

  if (process.env.OPENAI_API_KEY) {
    try {
      const OpenAI = (await import("openai")).default;
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await client.chat.completions.create({
        model: process.env.AI_MODEL ?? "gpt-4o-2024-08-06",
        messages: [
          {
            role: "system",
            content:
              "Rewrite the following shipment discrepancy list as a concise plain-English summary for a trade compliance officer. Do not change the facts.",
          },
          { role: "user", content: summary },
        ],
        max_tokens: 500,
      });
      return (
        response.choices[0]?.message?.content?.trim() ?? summary
      );
    } catch {
      return summary;
    }
  }

  return summary;
}

export async function runCompliancePipeline(
  shipmentId: string,
  userId?: string
): Promise<VerificationRunResult> {
  const verificationResult = await runVerificationChecks(shipmentId, userId);

  if (!verificationResult.success) {
    return verificationResult;
  }

  const regulatoryResult = await runRegulatoryEngine(shipmentId, userId);
  await recalculateTasks(shipmentId);

  const scoreResult = await calculatePassportScore(shipmentId, userId);
  await runRiskAssessment(shipmentId, userId);

  return {
    ...verificationResult,
    overallScore: scoreResult.overallScore,
    regulatoryScore: regulatoryResult.regulatoryScore,
  };
}

export async function runVerificationAndScore(
  shipmentId: string,
  userId?: string
): Promise<VerificationRunResult> {
  return runCompliancePipeline(shipmentId, userId);
}

export type { VerificationCheckResult };
