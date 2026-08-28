import type { SupabaseClient } from "@supabase/supabase-js";

interface AuditEventParams {
  organizationId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  shipmentId?: string;
  metadata?: Record<string, unknown>;
}

export async function writeAuditEvent(
  supabase: SupabaseClient,
  params: AuditEventParams
) {
  const { error } = await supabase.from("audit_events").insert({
    organization_id: params.organizationId,
    user_id: params.userId ?? null,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    shipment_id: params.shipmentId ?? null,
    metadata: params.metadata ?? {},
  });

  if (error) {
    console.error("Failed to write audit event:", error.message);
  }
}

export async function getCurrentUserProfile(supabase: SupabaseClient) {
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (profileError || !profile) {
    return null;
  }

  return { authUser, profile };
}
