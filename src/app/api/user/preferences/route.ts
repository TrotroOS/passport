import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isLocale } from "@/i18n/config";
import { localeCookieOptions } from "@/lib/i18n/user-locale";
import { getUserProfile, updateUserProfile } from "@/lib/user/user-profile";
import { updateUserPreferencesSchema } from "@/lib/validations";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getUserProfile(user.id);
  return NextResponse.json({
    preferred_language: profile?.preferred_language ?? "en",
  });
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
  const parsed = updateUserPreferencesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const preferred_language = parsed.data.preferred_language;
  if (!isLocale(preferred_language)) {
    return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
  }

  const profile = await updateUserProfile(user.id, { preferred_language });
  if (!profile) {
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }

  const response = NextResponse.json({
    preferred_language: profile.preferred_language,
  });
  response.cookies.set(localeCookieOptions(preferred_language));
  return response;
}
