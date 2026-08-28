import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { retryWebhookDelivery } from "@/lib/webhooks/webhook-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id: webhookId } = await params;
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

  const { data: webhook } = await supabase
    .from("webhook_subscriptions")
    .select("id")
    .eq("id", webhookId)
    .eq("organization_id", profile.organization_id)
    .single();

  if (!webhook) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  const { data: deliveries } = await supabase
    .from("webhook_deliveries")
    .select("*")
    .eq("webhook_id", webhookId)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ deliveries: deliveries ?? [] });
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id: webhookId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const deliveryId = body.delivery_id as string | undefined;

  if (!deliveryId) {
    return NextResponse.json({ error: "delivery_id required" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id || !["owner", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { data: delivery } = await supabase
    .from("webhook_deliveries")
    .select("id")
    .eq("id", deliveryId)
    .eq("webhook_id", webhookId)
    .single();

  if (!delivery) {
    return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
  }

  const success = await retryWebhookDelivery(deliveryId);

  if (!success) {
    return NextResponse.json({ error: "Retry failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "Retry initiated" });
}
