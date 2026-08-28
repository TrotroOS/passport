import {
  REQUIRED_FIELDS,
  validateExtractedData,
  type DocumentTypeName,
} from "@/lib/ai/schemas";

export type ArbiterSeverity = "info" | "warning" | "error";

export interface ArbiterRuleResult {
  ruleId: string;
  ruleDescription: string;
  passed: boolean;
  severity: ArbiterSeverity;
  details: Record<string, unknown>;
}

export interface ArbiterVerdict {
  approved: boolean;
  needsHumanReview: boolean;
  overallConfidence: number;
  events: ArbiterRuleResult[];
  normalizedData: Record<string, unknown>;
  lowConfidenceFields: string[];
}

export const APPROVAL_CONFIDENCE_THRESHOLD = 0.8;
export const LOW_CONFIDENCE_THRESHOLD = 0.5;

function rule(
  ruleId: string,
  ruleDescription: string,
  passed: boolean,
  severity: ArbiterSeverity,
  details: Record<string, unknown> = {}
): ArbiterRuleResult {
  return { ruleId, ruleDescription, passed, severity, details };
}

function normalizeDate(value: unknown): string | null {
  if (!value || typeof value !== "string") return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
}

function normalizeAmount(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]/g, "");
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
  }
  return null;
}

function normalizeString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function normalizeExtractedData(
  docType: string,
  data: Record<string, unknown>
): Record<string, unknown> {
  const fieldValidation = validateExtractedData(
    docType as DocumentTypeName,
    data
  );
  const base = fieldValidation.success ? fieldValidation.data : { ...data };

  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(base)) {
    if (key.startsWith("_")) {
      normalized[key] = value;
      continue;
    }
    if (key.includes("date")) {
      normalized[key] = normalizeDate(value);
    } else if (
      key.includes("amount") ||
      key.includes("total") ||
      key.includes("weight") ||
      key.includes("price") ||
      key === "value" ||
      key.includes("duty") ||
      key.includes("tax") ||
      key.includes("quantity")
    ) {
      normalized[key] = normalizeAmount(value);
    } else if (typeof value === "string") {
      normalized[key] = normalizeString(value);
    } else {
      normalized[key] = value;
    }
  }

  normalized._doc_type = docType;
  normalized._normalized_at = new Date().toISOString();

  return normalized;
}

function checkRequiredFields(
  docType: string,
  data: Record<string, unknown>
): ArbiterRuleResult[] {
  const required = REQUIRED_FIELDS[docType as DocumentTypeName];
  if (!required) {
    return [
      rule(
        "unknown_doc_type",
        "Document type not in schema registry",
        false,
        "warning",
        { docType }
      ),
    ];
  }

  const missing: string[] = [];
  for (const field of required) {
    const value = data[field];
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    ) {
      missing.push(field);
    }
  }

  return [
    rule(
      "required_fields",
      `All required fields present for ${docType}`,
      missing.length === 0,
      missing.length > 0 ? "error" : "info",
      { missing, required }
    ),
  ];
}

function checkConfidence(confidence: number): ArbiterRuleResult[] {
  const events: ArbiterRuleResult[] = [
    rule(
      "approval_confidence",
      `Classification confidence >= ${APPROVAL_CONFIDENCE_THRESHOLD} for auto-approval`,
      confidence >= APPROVAL_CONFIDENCE_THRESHOLD,
      confidence >= APPROVAL_CONFIDENCE_THRESHOLD ? "info" : "warning",
      { confidence, threshold: APPROVAL_CONFIDENCE_THRESHOLD }
    ),
  ];

  if (confidence < LOW_CONFIDENCE_THRESHOLD) {
    events.push(
      rule(
        "low_confidence",
        `Classification confidence below ${LOW_CONFIDENCE_THRESHOLD}`,
        false,
        "error",
        { confidence, threshold: LOW_CONFIDENCE_THRESHOLD }
      )
    );
  }

  return events;
}

function findLowConfidenceFields(
  data: Record<string, unknown>,
  confidence: number
): string[] {
  if (confidence >= APPROVAL_CONFIDENCE_THRESHOLD) return [];

  const required = Object.keys(data).filter((k) => !k.startsWith("_"));
  return required.filter((field) => {
    const value = data[field];
    return (
      value === null ||
      value === undefined ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    );
  });
}

export function runArbiter(
  docType: string,
  confidence: number,
  extractedData: Record<string, unknown>
): ArbiterVerdict {
  const normalizedData = normalizeExtractedData(docType, extractedData);

  const events: ArbiterRuleResult[] = [
    ...checkConfidence(confidence),
    ...checkRequiredFields(docType, normalizedData),
  ];

  const requiredCheck = events.find((e) => e.ruleId === "required_fields");
  const requiredPassed = requiredCheck?.passed ?? false;
  const confidenceOk = confidence >= APPROVAL_CONFIDENCE_THRESHOLD;

  const approved = confidenceOk && requiredPassed;
  const needsHumanReview =
    !approved || confidence < LOW_CONFIDENCE_THRESHOLD;

  const lowConfidenceFields = findLowConfidenceFields(normalizedData, confidence);

  return {
    approved,
    needsHumanReview,
    overallConfidence: confidence,
    events,
    normalizedData,
    lowConfidenceFields,
  };
}
