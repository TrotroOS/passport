import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export const STANDARD_INCOTERMS = [
  "EXW",
  "FCA",
  "FAS",
  "FOB",
  "CFR",
  "CIF",
  "CPT",
  "CIP",
  "DAP",
  "DPU",
  "DDP",
] as const;

export type IncotermCode = (typeof STANDARD_INCOTERMS)[number];

const INCOTERM_PATTERN =
  /\b(?:incoterm|incoterms|delivery\s+terms?|terms?\s+of\s+(?:delivery|sale|shipment)|freight\s+terms?)\s*[:\-]?\s*(EXW|FCA|FAS|FOB|CFR|CIF|CPT|CIP|DAP|DPU|DDP)\b/i;

const STANDALONE_INCOTERM = /\b(EXW|FCA|FAS|FOB|CFR|CIF|CPT|CIP|DAP|DPU|DDP)\b/;

export function normalizeIncoterm(value: unknown): IncotermCode | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toUpperCase();
  if (!trimmed) return null;

  const direct = trimmed.match(STANDALONE_INCOTERM);
  if (direct?.[1] && isValidIncoterm(direct[1])) {
    return direct[1] as IncotermCode;
  }

  const labeled = trimmed.match(INCOTERM_PATTERN);
  if (labeled?.[1] && isValidIncoterm(labeled[1])) {
    return labeled[1].toUpperCase() as IncotermCode;
  }

  return null;
}

export function isValidIncoterm(code: string): code is IncotermCode {
  return (STANDARD_INCOTERMS as readonly string[]).includes(code.toUpperCase());
}

export function extractIncotermFromData(
  data: Record<string, unknown>
): IncotermCode | null {
  const direct = normalizeIncoterm(data.incoterm);
  if (direct) return direct;

  for (const value of Object.values(data)) {
    if (typeof value === "string") {
      const match = value.match(INCOTERM_PATTERN);
      if (match?.[1]) {
        const normalized = normalizeIncoterm(match[1]);
        if (normalized) return normalized;
      }
    }
  }

  return null;
}

export async function applyIncotermToShipment(
  admin: AdminClient,
  shipmentId: string,
  incoterm: IncotermCode
): Promise<{ updated: boolean; conflict: boolean }> {
  const { data: shipment } = await admin
    .from("shipments")
    .select("incoterm")
    .eq("id", shipmentId)
    .single();

  if (!shipment) {
    return { updated: false, conflict: false };
  }

  if (!shipment.incoterm) {
    await admin.from("shipments").update({ incoterm }).eq("id", shipmentId);
    return { updated: true, conflict: false };
  }

  if (shipment.incoterm.toUpperCase() !== incoterm) {
    return { updated: false, conflict: true };
  }

  return { updated: false, conflict: false };
}
