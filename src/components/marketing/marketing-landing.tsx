import Link from "next/link";
import {
  BarChart3,
  CheckCircle2,
  FileSearch,
  Globe2,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LegalFooter } from "@/components/legal/legal-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BILLING_PLANS } from "@/lib/billing/plans";
import { SUPPORT_CONTACT_EMAIL } from "@/lib/legal/types";
import { cn } from "@/lib/utils";

interface MarketingLandingProps {
  isAuthenticated: boolean;
}

export async function MarketingLanding({ isAuthenticated }: MarketingLandingProps) {
  const t = await getTranslations("marketing");

  const features = [
    { key: "extraction", icon: Sparkles },
    { key: "verification", icon: FileSearch },
    { key: "score", icon: ShieldCheck },
    { key: "regulatory", icon: Globe2 },
    { key: "collaboration", icon: Users },
    { key: "tracking", icon: Truck },
    { key: "analytics", icon: BarChart3 },
  ] as const;

  const steps = ["step1", "step2", "step3", "step4"] as const;

  const corridors = [
    { key: "ghana", flag: "🇬🇭" },
    { key: "nigeria", flag: "🇳🇬" },
    { key: "kenya", flag: "🇰🇪" },
    { key: "more", flag: "🌍" },
  ] as const;

  const plans = [
    { tier: "free" as const, popular: false },
    { tier: "pro" as const, popular: true },
    { tier: "enterprise" as const, popular: false },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingHeader isAuthenticated={isAuthenticated} />

      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,hsl(var(--primary)/0.08),transparent_50%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.4)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.4)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-6">
              {t("hero.badge")}
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              {t("hero.title")}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              {t("hero.subtitle")}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="min-w-[160px]">
                <Link href={isAuthenticated ? "/dashboard" : "/signup"}>
                  {isAuthenticated ? t("nav.dashboard") : t("hero.primaryCta")}
                </Link>
              </Button>
              {!isAuthenticated ? (
                <Button asChild variant="outline" size="lg" className="min-w-[160px]">
                  <Link href="/login">{t("hero.secondaryCta")}</Link>
                </Button>
              ) : null}
            </div>
            <p className="mt-6 text-xs text-muted-foreground">{t("hero.disclaimer")}</p>
          </div>

          <dl className="mx-auto mt-16 grid max-w-3xl grid-cols-3 gap-6 text-center">
            <div>
              <dt className="text-sm text-muted-foreground">{t("stats.documents")}</dt>
              <dd className="mt-1 text-2xl font-bold text-primary">{t("stats.documentsValue")}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{t("stats.corridors")}</dt>
              <dd className="mt-1 text-2xl font-bold text-primary">{t("stats.corridorsValue")}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{t("stats.languages")}</dt>
              <dd className="mt-1 text-2xl font-bold text-primary">{t("stats.languagesValue")}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 border-b bg-muted/20 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("features.title")}</h2>
            <p className="mt-4 text-muted-foreground">{t("features.subtitle")}</p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ key, icon: Icon }) => (
              <Card key={key} className="border-border/80 bg-card/80 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <CardTitle className="text-base">{t(`features.${key}.title`)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {t(`features.${key}.description`)}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("howItWorks.title")}</h2>
            <p className="mt-4 text-muted-foreground">{t("howItWorks.subtitle")}</p>
          </div>
          <ol className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <li key={step} className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {index + 1}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{t(`howItWorks.${step}.title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t(`howItWorks.${step}.description`)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Corridors */}
      <section id="corridors" className="scroll-mt-20 border-y bg-muted/20 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("corridors.title")}</h2>
            <p className="mt-4 text-muted-foreground">{t("corridors.subtitle")}</p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {corridors.map(({ key, flag }) => (
              <div
                key={key}
                className="rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-primary/30"
              >
                <span className="text-3xl" aria-hidden>
                  {flag}
                </span>
                <h3 className="mt-4 text-lg font-semibold">{t(`corridors.${key}`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t(`corridors.${key}Detail`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("pricing.title")}</h2>
            <p className="mt-4 text-muted-foreground">{t("pricing.subtitle")}</p>
          </div>
          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {plans.map(({ tier, popular }) => {
              const plan = BILLING_PLANS[tier];
              const limits = [
                plan.limits.shipmentsPerMonth
                  ? t("pricing.shipments", { count: plan.limits.shipmentsPerMonth })
                  : t("pricing.unlimitedShipments"),
                plan.limits.apiCallsPerMonth
                  ? t("pricing.apiCalls", { count: plan.limits.apiCallsPerMonth.toLocaleString() })
                  : t("pricing.unlimitedApi"),
                plan.limits.seats
                  ? t("pricing.seats", { count: plan.limits.seats })
                  : t("pricing.unlimitedSeats"),
              ];

              return (
                <Card
                  key={tier}
                  className={cn(
                    "relative flex flex-col",
                    popular && "border-primary shadow-md ring-1 ring-primary/20"
                  )}
                >
                  {popular ? (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                      {t("pricing.popular")}
                    </Badge>
                  ) : null}
                  <CardHeader>
                    <CardTitle>{t(`pricing.${tier}`)}</CardTitle>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-bold">
                        {tier === "enterprise" ? t("pricing.custom") : plan.priceLabel.replace("/mo", "")}
                      </span>
                      {tier === "pro" ? (
                        <span className="text-muted-foreground">{t("pricing.perMonth")}</span>
                      ) : null}
                    </div>
                    <CardDescription className="mt-2">{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-2 text-sm">
                      {limits.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      asChild
                      className="w-full"
                      variant={popular ? "default" : "outline"}
                    >
                      <Link
                        href={
                          tier === "enterprise"
                            ? `mailto:${SUPPORT_CONTACT_EMAIL}?subject=Passport%20Enterprise`
                            : isAuthenticated
                              ? "/settings/billing"
                              : "/signup"
                        }
                      >
                        {tier === "free"
                          ? t("pricing.ctaFree")
                          : tier === "pro"
                            ? t("pricing.ctaPro")
                            : t("pricing.ctaEnterprise")}
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-primary py-16 text-primary-foreground sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("cta.title")}</h2>
          <p className="mt-4 text-primary-foreground/90">{t("cta.subtitle")}</p>
          <Button asChild size="lg" variant="secondary" className="mt-8">
            <Link href={isAuthenticated ? "/dashboard" : "/signup"}>{t("cta.button")}</Link>
          </Button>
          <p className="mt-6 text-sm text-primary-foreground/80">
            {t("cta.contact", { email: SUPPORT_CONTACT_EMAIL })}
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="mb-8 text-center text-sm text-muted-foreground">{t("footer.tagline")}</p>
          <LegalFooter />
        </div>
      </footer>
    </div>
  );
}
