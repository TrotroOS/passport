/** Map shipment destination strings to jurisdiction codes used in the regulations table. */

const JURISDICTION_ALIASES: Record<string, string> = {
  gh: "GH",
  gha: "GH",
  ghana: "GH",
  ng: "NG",
  nga: "NG",
  nigeria: "NG",
  ke: "KE",
  ken: "KE",
  kenya: "KE",
};

export function resolveDestinationJurisdiction(
  destination: string | null | undefined
): string | null {
  if (!destination?.trim()) return null;

  const normalized = destination.toLowerCase().trim();
  if (JURISDICTION_ALIASES[normalized]) {
    return JURISDICTION_ALIASES[normalized];
  }

  for (const [alias, code] of Object.entries(JURISDICTION_ALIASES)) {
    if (normalized.includes(alias)) return code;
  }

  return null;
}

export function isSupportedImportDestination(destination: string | null | undefined): boolean {
  return resolveDestinationJurisdiction(destination) !== null;
}

export function isGhanaDestination(destination: string | null | undefined): boolean {
  return resolveDestinationJurisdiction(destination) === "GH";
}
