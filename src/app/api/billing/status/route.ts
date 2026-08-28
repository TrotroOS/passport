import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationIdForUser } from "@/lib/auth/get-organization-id";
import { createAdminClient } from "@/lib/supabase/admin";
import { BILLING_PLANS, getPlan, type SubscriptionTier } from "@/lib/billing/plans";

export async function GET() {
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

  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select(
      "name, subscription_tier, subscription_status, billing_email, stripe_customer_id, trial_ends_at"
    )
    .eq("id", organizationId)
    .single();

  const tier = (org?.subscription_tier ?? "free") as SubscriptionTier;
  const plan = getPlan(tier);

  return NextResponse.json({
    organization: org?.name,
    tier,
    status: org?.subscription_status ?? "active",
    billingEmail: org?.billing_email ?? user.email,
    trialEndsAt: org?.trial_ends_at,
    hasStripeCustomer: Boolean(org?.stripe_customer_id),
    plan,
    availablePlans: Object.values(BILLING_PLANS),
    stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
  });
}
