import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isLocale } from "@/i18n/config";
import { localeCookieOptions } from "@/lib/i18n/user-locale";
import { getUserProfile, updateUserProfile } from "@/lib/user/user-profile";
import { updateUserProfileSchema } from "@/lib/validations";
import { normalizePhoneE164 } from "@/lib/inbound/normalize";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getUserProfile(user.id);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({ profile });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = updateUserProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const updates: {
    full_name?: string;
    phone?: string | null;
    preferred_language?: "en" | "fr" | "pt" | "ar";
  } = {};

  if (parsed.data.full_name !== undefined) {
    updates.full_name = parsed.data.full_name;
  }
  if (parsed.data.phone !== undefined) {
    updates.phone = parsed.data.phone?.trim()
      ? normalizePhoneE164(parsed.data.phone.trim())
      : null;
  }
  if (parsed.data.preferred_language !== undefined) {
    if (!isLocale(parsed.data.preferred_language)) {
      return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
    }
    updates.preferred_language = parsed.data.preferred_language;
  }

  const profile = await updateUserProfile(user.id, updates);
  if (!profile) {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }

  const response = NextResponse.json({ profile });
  if (updates.preferred_language) {
    response.cookies.set(localeCookieOptions(updates.preferred_language));
  }
  return response;
}
