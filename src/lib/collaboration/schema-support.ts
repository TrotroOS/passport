import type { SupabaseClient } from "@supabase/supabase-js";

let inviteeEmailSupported: boolean | null = null;

/** Whether migration 022 (invitee_email) is applied and visible to PostgREST. */
export async function hasInviteeEmailColumn(
  admin: SupabaseClient
): Promise<boolean> {
  if (inviteeEmailSupported !== null) return inviteeEmailSupported;

  const { error } = await admin
    .from("shipment_collaborators")
    .select("invitee_email")
    .limit(1);

  if (!error) {
    inviteeEmailSupported = true;
  } else if (isMissingInviteeEmailError(error.message)) {
    inviteeEmailSupported = false;
  } else {
    inviteeEmailSupported = false;
  }

  return inviteeEmailSupported;
}

export function resetInviteeEmailSchemaCache(): void {
  inviteeEmailSupported = null;
}

export function isMissingInviteeEmailError(message: string | undefined): boolean {
  if (!message) return false;
  return (
    message.includes("invitee_email") &&
    (message.includes("schema cache") ||
      message.includes("does not exist") ||
      message.includes("Could not find"))
  );
}
