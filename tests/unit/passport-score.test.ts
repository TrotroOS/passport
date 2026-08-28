import { describe, it, expect } from "vitest";
import {
  calculateDocumentationScore,
  calculateConsistencyScore,
  calculateCounterpartyScore,
  calculatePassportScoreFromData,
} from "@/lib/verification/passport-score";
import type { Discrepancy, VerificationCheck } from "@/types/database";

const baseCheck = (
  overrides: Partial<VerificationCheck>
): VerificationCheck => ({
  id: "1",
  shipment_id: "s1",
  check_id: "test",
  check_type: "missing_document",
  severity: "info",
  status: "passed",
  details: {},
  document_ids: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe("Passport Score", () => {
  it("returns 100 documentation when all core docs present", () => {
    const checks = [
      "invoice",
      "packing_list",
      "bill_of_lading",
      "import_declaration",
    ].map((t) =>
      baseCheck({ check_id: `doc_present_${t}`, status: "passed" })
    );
    expect(calculateDocumentationScore(checks)).toBe(100);
  });

  it("reduces documentation score for missing docs", () => {
    const checks = [
      baseCheck({ check_id: "doc_present_invoice", status: "passed" }),
    ];
    expect(calculateDocumentationScore(checks)).toBe(25);
  });

  it("subtracts for critical discrepancies", () => {
    const discrepancies: Discrepancy[] = [
      {
        id: "1",
        shipment_id: "s1",
        verification_check_id: null,
        discrepancy_type: "quantity_mismatch",
        severity: "critical",
        description: "Qty mismatch",
        values: {},
        status: "open",
        resolved_by: null,
        resolved_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    expect(calculateConsistencyScore(discrepancies)).toBe(85);
  });

  it("ignores resolved discrepancies in consistency", () => {
    const discrepancies: Discrepancy[] = [
      {
        id: "1",
        shipment_id: "s1",
        verification_check_id: null,
        discrepancy_type: "quantity_mismatch",
        severity: "critical",
        description: "Qty mismatch",
        values: {},
        status: "resolved",
        resolved_by: null,
        resolved_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    expect(calculateConsistencyScore(discrepancies.filter((d) => d.status === "open"))).toBe(100);
  });

  it("returns neutral counterparty score without data", () => {
    expect(calculateCounterpartyScore([], [])).toBe(50);
  });

  it("calculates overall score with regulatory component", () => {
    const checks = [
      "invoice",
      "packing_list",
      "bill_of_lading",
      "import_declaration",
    ].map((t) =>
      baseCheck({ check_id: `doc_present_${t}`, status: "passed" })
    );
    checks.push(
      baseCheck({ check_id: "seller_consistency", status: "passed" }),
      baseCheck({ check_id: "buyer_consistency", status: "passed" })
    );

    const result = calculatePassportScoreFromData(checks, [], [
      {
        id: "r1",
        shipment_id: "s1",
        regulation_id: "reg1",
        check_type: "document_present",
        status: "passed",
        severity: "info",
        details: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    expect(result.regulatory_score).toBe(100);
    expect(result.overall_score).toBeGreaterThan(0);
    expect(result.weights.regulatory).toBe(0.3);
  });
});
