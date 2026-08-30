import { resolveDestinationJurisdiction } from "@/lib/regulatory/jurisdiction";

export type SupportedJurisdiction = "GH" | "NG" | "KE";

export function normalizePartyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s&.-]/g, "");
}

export function jurisdictionFromDestination(
  destination: string | null | undefined
): SupportedJurisdiction | null {
  const code = resolveDestinationJurisdiction(destination);
  if (code === "GH" || code === "NG" || code === "KE") return code;
  return null;
}

export interface MoatStrengthInput {
  orgShipmentsOnCorridor: number;
  orgClearedOnCorridor: number;
  partyMemoryCount: number;
}

export type MoatStrengthTier = "building" | "developing" | "strong";

export function computeMoatStrength(input: MoatStrengthInput): {
  tier: MoatStrengthTier;
  score: number;
  label: string;
} {
  const corridorDepth = Math.min(input.orgShipmentsOnCorridor / 10, 1) * 40;
  const clearanceHistory = Math.min(input.orgClearedOnCorridor / 5, 1) * 35;
  const counterpartyDepth = Math.min(input.partyMemoryCount / 8, 1) * 25;
  const score = Math.round(corridorDepth + clearanceHistory + counterpartyDepth);

  if (score >= 70) {
    return { tier: "strong", score, label: "Strong corridor memory" };
  }
  if (score >= 35) {
    return { tier: "developing", score, label: "Developing corridor memory" };
  }
  return { tier: "building", score, label: "Building corridor memory" };
}

export function scoreVsBenchmark(
  shipmentScore: number | null,
  benchmark: number
): "above" | "at" | "below" | "unknown" {
  if (shipmentScore == null) return "unknown";
  if (shipmentScore >= benchmark + 3) return "above";
  if (shipmentScore <= benchmark - 3) return "below";
  return "at";
}

export function mergeDiscrepancyCounts(
  existing: Array<{ type: string; count: number }>,
  newTypes: string[]
): Array<{ type: string; count: number }> {
  const map = new Map<string, number>();
  for (const item of existing) {
    map.set(item.type, item.count);
  }
  for (const type of newTypes) {
    map.set(type, (map.get(type) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export function partyRiskSignal(input: {
  shipmentCount: number;
  blockedCount: number;
  clearedCount: number;
}): "trusted" | "watch" | "high_risk" | "new" {
  if (input.shipmentCount <= 1) return "new";
  const blockRate = input.blockedCount / input.shipmentCount;
  if (blockRate >= 0.5) return "high_risk";
  if (blockRate >= 0.25 || input.blockedCount >= 2) return "watch";
  if (input.clearedCount >= 2 && blockRate === 0) return "trusted";
  return "watch";
}
