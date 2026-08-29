import type { SupabaseClient } from "@supabase/supabase-js";

let inviteeEmailSupported: boolean | null = null;
let participantTypeSupported: boolean | null = null;

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

/** Whether migration 026 (participant_type) is applied and visible to PostgREST. */
export async function hasParticipantTypeColumn(
  admin: SupabaseClient
): Promise<boolean> {
  if (participantTypeSupported !== null) return participantTypeSupported;

  const { error } = await admin
    .from("shipment_collaborators")
    .select("participant_type")
    .limit(1);

  if (!error) {
    participantTypeSupported = true;
  } else if (isMissingParticipantTypeError(error.message)) {
    participantTypeSupported = false;
  } else {
    participantTypeSupported = false;
  }

  return participantTypeSupported;
}

export function resetInviteeEmailSchemaCache(): void {
  inviteeEmailSupported = null;
}

export function resetParticipantTypeSchemaCache(): void {
  participantTypeSupported = null;
}

export function resetCollaboratorSchemaCache(): void {
  resetInviteeEmailSchemaCache();
  resetParticipantTypeSchemaCache();
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

export function isMissingParticipantTypeError(message: string | undefined): boolean {
  if (!message) return false;
  return (
    message.includes("participant_type") &&
    (message.includes("schema cache") ||
      message.includes("does not exist") ||
      message.includes("Could not find"))
  );
}
