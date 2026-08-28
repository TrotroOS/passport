import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile, updateUserProfile } from "@/lib/user/user-profile";
import { updatePhoneSchema } from "@/lib/validations";
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
  return NextResponse.json({ phone: profile?.phone ?? null });
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
  const parsed = updatePhoneSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const phone = parsed.data.phone?.trim()
    ? normalizePhoneE164(parsed.data.phone.trim())
    : null;

  const profile = await updateUserProfile(user.id, { phone });
  if (!profile) {
    return NextResponse.json({ error: "Failed to update phone" }, { status: 500 });
  }

  return NextResponse.json({ phone: profile.phone });
}
