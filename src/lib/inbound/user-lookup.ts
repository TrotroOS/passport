import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhoneE164, parseEmailAddress } from "@/lib/inbound/normalize";
import type { User } from "@/types/database";

export interface IdentifiedUser {
  user: Pick<User, "id" | "email" | "organization_id" | "phone">;
  organizationId: string;
}

export async function findUserByEmail(
  emailRaw: string
): Promise<IdentifiedUser | null> {
  const email = parseEmailAddress(emailRaw);
  const admin = createAdminClient();

  const { data: user } = await admin
    .from("users")
    .select("id, email, organization_id, phone")
    .ilike("email", email)
    .not("organization_id", "is", null)
    .maybeSingle();

  if (!user?.organization_id) return null;
  return { user, organizationId: user.organization_id };
}

export async function findUserByPhone(
  phoneRaw: string
): Promise<IdentifiedUser | null> {
  const normalized = normalizePhoneE164(phoneRaw);
  const admin = createAdminClient();

  const { data: users } = await admin
    .from("users")
    .select("id, email, organization_id, phone")
    .not("phone", "is", null)
    .not("organization_id", "is", null);

  if (!users?.length) return null;

  const match = users.find((u) => {
    if (!u.phone) return false;
    return normalizePhoneE164(u.phone) === normalized;
  });

  if (!match?.organization_id) return null;
  return { user: match, organizationId: match.organization_id };
}
