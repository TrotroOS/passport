/**
 * External source connectors — pluggable integrations for governance-backed data.
 * Production deployments wire API keys via env; static fallbacks keep dev working.
 */

export type { SanctionsMatch } from "@/lib/governance/external-sources/opensanctions";
export { queryOpenSanctions } from "@/lib/governance/external-sources/opensanctions";
export {
  getOpenSanctionsApiKey,
  getOpenSanctionsMatchUrl,
  getOpenSanctionsThreshold,
  isOpenSanctionsConfigured,
  isOpenSanctionsEnabled,
} from "@/lib/governance/external-sources/opensanctions-config";

/** HS code reference lookup (WCO chapter metadata — static). */
export function lookupHsReference(hsCode: string): {
  sourceId: string;
  chapter: string;
  description: string;
} | null {
  const digits = hsCode.replace(/\D/g, "");
  if (digits.length < 2) return null;

  const chapter = digits.slice(0, 2);
  const descriptions: Record<string, string> = {
    "84": "Nuclear reactors, boilers, machinery and mechanical appliances",
    "85": "Electrical machinery and equipment",
    "87": "Vehicles other than railway or tramway rolling stock",
    "30": "Pharmaceutical products",
    "72": "Iron and steel",
  };

  return {
    sourceId: "wco-hs",
    chapter,
    description: descriptions[chapter] ?? `HS Chapter ${chapter}`,
  };
}

/** Ghana GRA tariff reference for duty estimates. */
export function lookupGraTariffReference(hsCode: string): {
  sourceId: string;
  authority: string;
  note: string;
} {
  return {
    sourceId: "gra-ghana",
    authority: "Ghana Revenue Authority",
    note: `Tariff schedule reference for HS ${hsCode.slice(0, 6)}`,
  };
}
