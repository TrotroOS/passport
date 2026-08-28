"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BillingPlan {
  id: string;
  name: string;
  priceLabel: string;
  description: string;
  limits: {
    shipmentsPerMonth: number | null;
    apiCallsPerMonth: number | null;
    seats: number | null;
  };
}

interface BillingStatus {
  organization: string;
  tier: string;
  status: string;
  billingEmail: string;
  plan: BillingPlan;
  availablePlans: BillingPlan[];
  stripeConfigured: boolean;
}

function formatLimit(value: number | null, suffix: string): string {
  if (value == null) return `Unlimited ${suffix}`;
  return `${value.toLocaleString()} ${suffix}`;
}

export function BillingSettingsPanel() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/status");
      if (res.ok) {
        setStatus(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpgrade(tier: string) {
    setUpgrading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Checkout failed");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error("Checkout failed");
    } finally {
      setUpgrading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading billing…
      </div>
    );
  }

  if (!status) {
    return <p className="text-sm text-muted-foreground">Unable to load billing information.</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Current plan</CardTitle>
          </div>
          <CardDescription>
            {status.organization} · {status.billingEmail}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-2xl font-bold">{status.plan.name}</span>
            <Badge variant="secondary">{status.plan.priceLabel}</Badge>
            <Badge>{status.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{status.plan.description}</p>
          <ul className="text-sm text-muted-foreground">
            <li>{formatLimit(status.plan.limits.shipmentsPerMonth, "shipments / month")}</li>
            <li>{formatLimit(status.plan.limits.apiCallsPerMonth, "API calls / month")}</li>
            <li>{formatLimit(status.plan.limits.seats, "seats")}</li>
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {status.availablePlans.map((plan) => {
          const isCurrent = plan.id === status.tier;
          return (
            <Card key={plan.id} className={isCurrent ? "border-primary" : undefined}>
              <CardHeader>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <CardDescription>{plan.priceLabel}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{plan.description}</p>
                {isCurrent ? (
                  <Button variant="outline" disabled className="w-full">
                    Current plan
                  </Button>
                ) : plan.id === "enterprise" ? (
                  <Button variant="outline" className="w-full" asChild>
                    <a href="mailto:sales@passport.trade?subject=Passport%20Enterprise">Contact sales</a>
                  </Button>
                ) : status.stripeConfigured ? (
                  <Button
                    className="w-full"
                    disabled={upgrading}
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    {upgrading ? "Redirecting…" : `Upgrade to ${plan.name}`}
                  </Button>
                ) : (
                  <Button variant="outline" disabled className="w-full">
                    Stripe not configured
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
