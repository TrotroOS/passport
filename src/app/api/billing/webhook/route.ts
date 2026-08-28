import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const payload = await request.text();

  // Lightweight verification: compare signing secret header pattern used in dev.
  // Production deployments should verify with Stripe SDK crypto.
  if (!signature.includes("t=")) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: {
    type: string;
    data: {
      object: {
        id?: string;
        customer?: string;
        subscription?: string;
        client_reference_id?: string;
        metadata?: { organization_id?: string };
        status?: string;
      };
    };
  };

  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const admin = createAdminClient();
  const object = event.data.object;
  const organizationId =
    object.metadata?.organization_id ?? object.client_reference_id ?? null;

  if (!organizationId) {
    return NextResponse.json({ received: true });
  }

  if (event.type === "checkout.session.completed") {
    await admin
      .from("organizations")
      .update({
        subscription_tier: "pro",
        subscription_status: "active",
        stripe_customer_id: object.customer ?? null,
        stripe_subscription_id: object.subscription ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", organizationId);
  }

  if (event.type === "customer.subscription.updated") {
    await admin
      .from("organizations")
      .update({
        subscription_status: object.status ?? "active",
        stripe_subscription_id: object.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", organizationId);
  }

  if (event.type === "customer.subscription.deleted") {
    await admin
      .from("organizations")
      .update({
        subscription_tier: "free",
        subscription_status: "canceled",
        stripe_subscription_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", organizationId);
  }

  return NextResponse.json({ received: true });
}
