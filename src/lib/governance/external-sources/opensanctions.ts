import {
  getOpenSanctionsApiKey,
  getOpenSanctionsMatchUrl,
  getOpenSanctionsThreshold,
  isOpenSanctionsConfigured,
  OPENSANCTIONS_SANCTIONS_TOPICS,
} from "@/lib/governance/external-sources/opensanctions-config";

export interface SanctionsMatch {
  entityName: string;
  listId: string;
  listName: string;
  matchScore: number;
  riskCategory: string;
  sourceUrl?: string;
  entityId?: string;
  datasets?: string[];
  match: boolean;
}

type OpenSanctionsSchema = "Company" | "LegalEntity" | "Person";

interface OpenSanctionsResult {
  id?: string;
  caption?: string;
  score?: number;
  match?: boolean;
  datasets?: string[];
  properties?: {
    topics?: string[];
    programId?: string[];
  };
}

interface OpenSanctionsResponse {
  responses?: Record<
    string,
    {
      status?: number;
      results?: OpenSanctionsResult[];
    }
  >;
}

function inferSchemas(partyName: string): OpenSanctionsSchema[] {
  const normalized = partyName.toLowerCase();
  const companyHints =
    /\b(ltd|limited|llc|inc|corp|corporation|company|co\.|gmbh|plc|sa|bv|ag|group|trading|exports?|imports?)\b/.test(
      normalized
    );
  if (companyHints) {
    return ["Company", "LegalEntity"];
  }
  return ["Person", "Company"];
}

function mapResult(result: OpenSanctionsResult, partyName: string, threshold: number): SanctionsMatch {
  const score = result.score ?? 0;
  const entityId = result.id;
  return {
    entityName: result.caption ?? partyName,
    listId: "opensanctions",
    listName: result.datasets?.[0] ?? "OpenSanctions",
    matchScore: Math.round(score * 100),
    riskCategory: result.properties?.topics?.includes("debarment") ? "debarment" : "sanctions",
    sourceUrl: entityId ? `https://www.opensanctions.org/entities/${entityId}/` : "https://www.opensanctions.org/",
    entityId,
    datasets: result.datasets,
    match: result.match === true || score >= threshold,
  };
}

/** Query OpenSanctions match API when configured; returns empty on failure or when disabled. */
export async function queryOpenSanctions(partyName: string): Promise<SanctionsMatch[]> {
  if (!isOpenSanctionsConfigured()) {
    return [];
  }

  const apiKey = getOpenSanctionsApiKey();
  if (!apiKey) {
    return [];
  }

  const trimmed = partyName.trim();
  if (!trimmed) {
    return [];
  }

  const threshold = getOpenSanctionsThreshold();
  const schemas = inferSchemas(trimmed);
  const queries = Object.fromEntries(
    schemas.map((schema, index) => [
      `q${index + 1}`,
      { schema, properties: { name: [trimmed] } },
    ])
  );

  const url = new URL(getOpenSanctionsMatchUrl());
  url.searchParams.set("algorithm", "best");
  url.searchParams.set("threshold", String(threshold));
  for (const topic of OPENSANCTIONS_SANCTIONS_TOPICS) {
    url.searchParams.append("topics", topic);
  }

  try {
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `ApiKey ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ queries }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return [];
    }

    const data = (await res.json()) as OpenSanctionsResponse;
    const allResults: SanctionsMatch[] = [];

    for (const response of Object.values(data.responses ?? {})) {
      for (const result of response.results ?? []) {
        const mapped = mapResult(result, trimmed, threshold);
        if (mapped.match) {
          allResults.push(mapped);
        }
      }
    }

    return allResults
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 3);
  } catch {
    return [];
  }
}
