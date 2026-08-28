export interface BolContainerExtraction {
  container_numbers?: string[] | null;
  vessel?: string | null;
  bill_of_lading_number?: string | null;
  carrier?: string | null;
  voyage_number?: string | null;
}

export function extractContainersFromBolData(
  data: Record<string, unknown>
): BolContainerExtraction {
  const rawContainers = data.container_numbers;
  let container_numbers: string[] | null = null;

  if (Array.isArray(rawContainers)) {
    container_numbers = rawContainers
      .map((value) => String(value).trim().toUpperCase())
      .filter(Boolean);
  } else if (typeof rawContainers === "string" && rawContainers.trim()) {
    container_numbers = rawContainers
      .split(/[,;\s]+/)
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean);
  }

  return {
    container_numbers: container_numbers?.length ? container_numbers : null,
    vessel: typeof data.vessel === "string" ? data.vessel.trim() || null : null,
    bill_of_lading_number:
      typeof data.bill_of_lading_number === "string"
        ? data.bill_of_lading_number.trim() || null
        : null,
    carrier:
      typeof data.carrier === "string" ? data.carrier.trim() || null : null,
    voyage_number:
      typeof data.voyage_number === "string"
        ? data.voyage_number.trim() || null
        : null,
  };
}

export function normalizeContainerNumber(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}
