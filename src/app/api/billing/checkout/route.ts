import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationIdForUser } from "@/lib/auth/get-organization-id";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppUrl } from "@/lib/app-url";
import { getStripePriceId, type SubscriptionTier } from "@/lib/billing/plans";

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: "Stripe is not configured on this deployment" },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = await getOrganizationIdForUser(supabase, user.id);
  if (!organizationId) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const body = (await request.json()) as { tier?: SubscriptionTier };
  const tier = body.tier ?? "pro";
  const priceId = getStripePriceId(tier);

  if (!priceId) {
    return NextResponse.json(
      { error: `Stripe price not configured for ${tier} plan` },
      { status: 503 }
    );
  }

  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("name, stripe_customer_id, billing_email")
    .eq("id", organizationId)
    .single();

  const appUrl = getAppUrl();
  const params = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    success_url: `${appUrl}/settings/billing?checkout=success`,
    cancel_url: `${appUrl}/settings/billing?checkout=canceled`,
    client_reference_id: organizationId,
    "metadata[organization_id]": organizationId,
    customer_email: org?.billing_email ?? user.email ?? "",
  });

  if (org?.stripe_customer_id) {
    params.delete("customer_email");
    params.set("customer", org.stripe_customer_id);
  }

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const session = (await response.json()) as { id?: string; url?: string; error?: { message?: string } };

  if (!response.ok) {
    return NextResponse.json(
      { error: session.error?.message ?? "Failed to create checkout session" },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: session.url, sessionId: session.id });
}
