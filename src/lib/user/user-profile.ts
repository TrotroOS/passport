import { createAdminClient } from "@/lib/supabase/admin";
import { defaultLocale, isLocale, type Locale } from "@/i18n/config";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  preferred_language: Locale;
  role: string;
  organization_id: string | null;
  organization_name?: string | null;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("id, email, full_name, phone, preferred_language, role, organization_id, organizations(name)")
    .eq("id", userId)
    .single();

  if (!data) return null;

  const org =
    data.organizations &&
    typeof data.organizations === "object" &&
    "name" in data.organizations
      ? (data.organizations as { name: string }).name
      : null;

  return {
    id: data.id,
    email: data.email,
    full_name: data.full_name,
    phone: data.phone,
    preferred_language: isLocale(data.preferred_language)
      ? data.preferred_language
      : defaultLocale,
    role: data.role,
    organization_id: data.organization_id,
    organization_name: org,
  };
}

export async function updateUserProfile(
  userId: string,
  updates: {
    full_name?: string;
    phone?: string | null;
    preferred_language?: Locale;
  }
): Promise<UserProfile | null> {
  const admin = createAdminClient();
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.full_name !== undefined) {
    payload.full_name = updates.full_name;
  }
  if (updates.phone !== undefined) {
    payload.phone = updates.phone;
  }
  if (updates.preferred_language !== undefined) {
    payload.preferred_language = updates.preferred_language;
  }

  const { error } = await admin.from("users").update(payload).eq("id", userId);
  if (error) return null;

  return getUserProfile(userId);
}
