export type SubscriptionTier = "free" | "pro" | "enterprise";

export interface BillingPlan {
  id: SubscriptionTier;
  name: string;
  priceLabel: string;
  description: string;
  limits: {
    shipmentsPerMonth: number | null;
    apiCallsPerMonth: number | null;
    seats: number | null;
  };
  stripePriceIdEnv?: string;
}

export const BILLING_PLANS: Record<SubscriptionTier, BillingPlan> = {
  free: {
    id: "free",
    name: "Free",
    priceLabel: "$0",
    description: "For pilots and small teams getting started with trade compliance.",
    limits: {
      shipmentsPerMonth: 10,
      apiCallsPerMonth: 1_000,
      seats: 3,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceLabel: "$99/mo",
    description: "For growing importers and broker teams with active shipment volume.",
    limits: {
      shipmentsPerMonth: 100,
      apiCallsPerMonth: 25_000,
      seats: 15,
    },
    stripePriceIdEnv: "STRIPE_PRICE_PRO",
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    priceLabel: "Custom",
    description: "Unlimited corridors, SSO, dedicated support, and custom integrations.",
    limits: {
      shipmentsPerMonth: null,
      apiCallsPerMonth: null,
      seats: null,
    },
  },
};

export function getPlan(tier: SubscriptionTier): BillingPlan {
  return BILLING_PLANS[tier] ?? BILLING_PLANS.free;
}

export function getStripePriceId(tier: SubscriptionTier): string | null {
  const plan = getPlan(tier);
  if (!plan.stripePriceIdEnv) return null;
  return process.env[plan.stripePriceIdEnv] ?? null;
}
