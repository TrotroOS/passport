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

export const SUPPORTED_IMPORT_CORRIDORS = [
  { code: "GH", label: "Ghana" },
  { code: "NG", label: "Nigeria" },
  { code: "KE", label: "Kenya" },
] as const;

export type SupportedCorridorCode = (typeof SUPPORTED_IMPORT_CORRIDORS)[number]["code"];

export const SUPPORTED_DESTINATION_OPTIONS = SUPPORTED_IMPORT_CORRIDORS.map((corridor) => ({
  value: corridor.label,
  label: `${corridor.label} (${corridor.code})`,
  code: corridor.code,
}));

/** Canonical display label for a supported destination, or null if unsupported. */
export function normalizeDestinationCountry(
  destination: string | null | undefined
): string | null {
  const code = resolveDestinationJurisdiction(destination);
  if (!code) return null;
  return SUPPORTED_IMPORT_CORRIDORS.find((corridor) => corridor.code === code)?.label ?? null;
}

export function isPlaceholderDestination(destination: string | null | undefined): boolean {
  if (!destination?.trim()) return true;
  const normalized = destination.trim().toLowerCase();
  return ["test", "testing", "demo", "sample", "tbd", "n/a", "na", "none"].includes(normalized);
}

export function supportedCorridorLabels(): string {
  return SUPPORTED_IMPORT_CORRIDORS.map((c) => c.label).join(", ");
}

export function describeImportCorridor(destination: string | null | undefined): {
  supported: boolean;
  code: string | null;
  label: string | null;
  destination: string | null;
} {
  const trimmed = destination?.trim() || null;
  const code = resolveDestinationJurisdiction(destination);
  if (!code) {
    return { supported: false, code: null, label: null, destination: trimmed };
  }
  const match = SUPPORTED_IMPORT_CORRIDORS.find((c) => c.code === code);
  return {
    supported: true,
    code,
    label: match?.label ?? code,
    destination: trimmed,
  };
}
