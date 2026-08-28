import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/user/user-profile";
import { updateNotificationPreferencesSchema } from "@/lib/validations";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationPreferences } from "@/types/database";

const DEFAULT_PREFS: NotificationPreferences = {
  email_alerts: true,
  tracking_updates: true,
  compliance_alerts: true,
  weekly_digest: false,
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("notification_preferences")
    .eq("id", user.id)
    .single();

  const prefs = (data?.notification_preferences as NotificationPreferences) ?? DEFAULT_PREFS;
  return NextResponse.json({ preferences: prefs });
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
  const parsed = updateNotificationPreferencesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("users")
    .select("notification_preferences")
    .eq("id", user.id)
    .single();

  const current =
    (existing?.notification_preferences as NotificationPreferences) ?? DEFAULT_PREFS;
  const merged = { ...current, ...parsed.data };

  const { error } = await admin
    .from("users")
    .update({ notification_preferences: merged, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await getUserProfile(user.id);
  return NextResponse.json({ preferences: merged });
}
