/**
 * External source connectors — pluggable integrations for governance-backed data.
 * Production deployments wire API keys via env; static fallbacks keep dev working.
 */

export interface SanctionsMatch {
  entityName: string;
  listId: string;
  listName: string;
  matchScore: number;
  riskCategory: string;
  sourceUrl?: string;
}

const OPENSANCTIONS_URL =
  process.env.OPENSANCTIONS_API_URL ?? "https://api.opensanctions.org/match/default";

/** Query OpenSanctions API when configured; returns empty on failure. */
export async function queryOpenSanctions(partyName: string): Promise<SanctionsMatch[]> {
  if (process.env.OPENSANCTIONS_ENABLED !== "true") {
    return [];
  }

  try {
    const res = await fetch(OPENSANCTIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        queries: {
          q1: { schema: "Company", properties: { name: [partyName] } },
        },
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];

    const data = (await res.json()) as {
      responses?: {
        q1?: {
          results?: Array<{
            caption?: string;
            score?: number;
            datasets?: string[];
          }>;
        };
      };
    };

    const results = data.responses?.q1?.results ?? [];
    return results.slice(0, 3).map((r) => ({
      entityName: r.caption ?? partyName,
      listId: "opensanctions",
      listName: "OpenSanctions",
      matchScore: Math.round((r.score ?? 0.5) * 100),
      riskCategory: "sanctions",
      sourceUrl: "https://www.opensanctions.org/",
    }));
  } catch {
    return [];
  }
}

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
