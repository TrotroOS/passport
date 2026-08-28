import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { registerWebhook } from "@/lib/webhooks/webhook-service";
import { createWebhookSchema } from "@/lib/validations";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const { data: webhooks } = await supabase
    .from("webhook_subscriptions")
    .select("id, url, events, is_active, created_at, updated_at")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ webhooks: webhooks ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = createWebhookSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { data: profile } = await supabase
    .from("users")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id || !["owner", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const result = await registerWebhook(
    profile.organization_id,
    parsed.data.url,
    parsed.data.events
  );

  return NextResponse.json({
    webhook: { id: result.id, url: parsed.data.url, events: parsed.data.events },
    secret: result.secret,
    message: "Store the webhook secret securely for signature verification.",
  });
}
