import { createAdminClient } from "@/lib/supabase/admin";
import {
  extractShipmentReferences,
  normalizeReferenceForLookup,
} from "@/lib/inbound/shipment-reference";

export interface ResolvedShipment {
  shipmentId: string;
  shipmentRef: string;
  created: boolean;
}

export async function resolveShipmentForInbound(
  organizationId: string,
  userId: string,
  subject: string | null | undefined,
  bodyText: string | null | undefined
): Promise<ResolvedShipment> {
  const admin = createAdminClient();
  const combined = [subject, bodyText].filter(Boolean).join("\n");
  const candidates = extractShipmentReferences(combined);

  for (const candidate of candidates) {
    const normalized = normalizeReferenceForLookup(candidate);

    const { data: alias } = await admin
      .from("shipment_references")
      .select("shipment_id, reference_text")
      .eq("organization_id", organizationId)
      .eq("reference_text", normalized)
      .maybeSingle();

    if (alias?.shipment_id) {
      const { data: shipment } = await admin
        .from("shipments")
        .select("id, shipment_ref")
        .eq("id", alias.shipment_id)
        .single();
      if (shipment) {
        return {
          shipmentId: shipment.id,
          shipmentRef: shipment.shipment_ref,
          created: false,
        };
      }
    }

    const { data: direct } = await admin
      .from("shipments")
      .select("id, shipment_ref")
      .eq("organization_id", organizationId)
      .ilike("shipment_ref", candidate)
      .maybeSingle();

    if (direct) {
      return {
        shipmentId: direct.id,
        shipmentRef: direct.shipment_ref,
        created: false,
      };
    }
  }

  const suffix = Date.now().toString(36).slice(-6).toUpperCase();
  const newRef = `INB-${new Date().getFullYear()}-${suffix}`;

  const { data: created, error } = await admin
    .from("shipments")
    .insert({
      organization_id: organizationId,
      shipment_ref: newRef,
      status: "draft",
      created_by: userId,
    })
    .select("id, shipment_ref")
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "Failed to create draft shipment");
  }

  return {
    shipmentId: created.id,
    shipmentRef: created.shipment_ref,
    created: true,
  };
}
