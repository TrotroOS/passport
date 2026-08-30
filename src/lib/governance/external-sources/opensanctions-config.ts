const DEFAULT_BASE_URL = "https://api.opensanctions.org";
const DEFAULT_DATASET = "default";

export function isOpenSanctionsEnabled(): boolean {
  return process.env.OPENSANCTIONS_ENABLED === "true";
}

export function getOpenSanctionsApiKey(): string | undefined {
  const key = process.env.OPENSANCTIONS_API_KEY?.trim();
  return key || undefined;
}

/** True when live OpenSanctions screening should run. */
export function isOpenSanctionsConfigured(): boolean {
  return isOpenSanctionsEnabled() && Boolean(getOpenSanctionsApiKey());
}

export function getOpenSanctionsMatchUrl(): string {
  const configured = process.env.OPENSANCTIONS_API_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  return `${DEFAULT_BASE_URL}/match/${DEFAULT_DATASET}`;
}

export function getOpenSanctionsThreshold(): number {
  const raw = process.env.OPENSANCTIONS_MATCH_THRESHOLD?.trim();
  if (!raw) return 0.75;
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1) return 0.75;
  return parsed;
}

export const OPENSANCTIONS_SANCTIONS_TOPICS = [
  "sanction",
  "sanction.linked",
  "debarment",
] as const;
