import Link from "next/link";
import {
  BarChart3,
  CheckCircle2,
  ChevronRight,
  FileSearch,
  Globe2,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LegalFooter } from "@/components/legal/legal-footer";
import { MarketingAudiences } from "@/components/marketing/marketing-audiences";
import { MarketingCompare } from "@/components/marketing/marketing-compare";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingHeroPreview } from "@/components/marketing/marketing-hero-preview";
import { MarketingStickyCta } from "@/components/marketing/marketing-sticky-cta";
import { MarketingTestimonials } from "@/components/marketing/marketing-testimonials";
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
    { tier: "pro" as const, popular: true },
    { tier: "free" as const, popular: false },
    { tier: "enterprise" as const, popular: false },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 text-foreground md:pb-0">
      <MarketingHeader isAuthenticated={isAuthenticated} />
      <MarketingStickyCta isAuthenticated={isAuthenticated} />

      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-primary/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 top-32 h-48 w-48 rounded-full bg-sky-400/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,hsl(var(--primary)/0.1),transparent_55%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.35)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.35)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_at_center,black_15%,transparent_70%)] sm:bg-[size:4rem_4rem]"
        />

        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-3xl text-center lg:max-w-none lg:text-left">
            <div className="lg:grid lg:grid-cols-2 lg:items-center lg:gap-12">
              <div>
                <Badge
                  variant="secondary"
                  className="mb-4 border-primary/20 bg-primary/5 px-3 py-1 text-primary sm:mb-6"
                >
                  {t("hero.badge")}
                </Badge>
                <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                  {t("hero.title")}
                </h1>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-xl">
                  {t("hero.subtitle")}
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                  <Button asChild size="lg" className="h-12 w-full text-base sm:min-w-[160px] sm:w-auto">
                    <Link href={isAuthenticated ? "/dashboard" : "/signup"}>
                      {isAuthenticated ? t("nav.dashboard") : t("hero.primaryCta")}
                      <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                  {!isAuthenticated ? (
                    <Button
                      asChild
                      variant="outline"
                      size="lg"
                      className="h-12 w-full text-base sm:min-w-[160px] sm:w-auto"
                    >
                      <Link href="/login">{t("hero.secondaryCta")}</Link>
                    </Button>
                  ) : null}
                </div>
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground sm:mt-6">
                  {t("hero.disclaimer")}
                </p>
              </div>

              <div className="mt-2 lg:mt-0">
                <MarketingHeroPreview />
              </div>
            </div>
          </div>

          <dl className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-3 sm:mt-16 sm:grid-cols-3 sm:gap-6">
            {(
              [
                ["documents", "documentsValue"],
                ["corridors", "corridorsValue"],
                ["languages", "languagesValue"],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-border/80 bg-card/60 px-4 py-4 text-center shadow-sm backdrop-blur-sm sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none"
              >
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground sm:text-sm sm:normal-case sm:tracking-normal">
                  {t(`stats.${label}`)}
                </dt>
                <dd className="mt-1 text-3xl font-bold tabular-nums text-primary sm:text-2xl">
                  {t(`stats.${value}`)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <MarketingAudiences />

      {/* Features */}
      <section id="features" className="scroll-mt-16 border-b bg-muted/30 py-14 sm:scroll-mt-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl sm:mx-auto sm:text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">{t("features.title")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:mt-4 sm:text-base">
              {t("features.subtitle")}
            </p>
            <p className="mt-2 text-xs text-muted-foreground md:hidden">{t("mobile.swipeHint")}</p>
          </div>

          <div className="marketing-scroll-x -mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:mt-14 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
            {features.map(({ key, icon: Icon }) => (
              <Card
                key={key}
                className="w-[78vw] max-w-[18rem] shrink-0 snap-center border-border/80 bg-card shadow-md sm:w-auto sm:max-w-none sm:shadow-sm"
              >
                <CardHeader className="pb-2">
                  <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <CardTitle className="text-base leading-snug">
                    {t(`features.${key}.title`)}
                  </CardTitle>
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
      <section id="how-it-works" className="scroll-mt-16 py-14 sm:scroll-mt-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl sm:mx-auto sm:text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">{t("howItWorks.title")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:mt-4 sm:text-base">
              {t("howItWorks.subtitle")}
            </p>
          </div>

          <ol className="relative mt-10 space-y-0 sm:mt-14 md:grid md:grid-cols-2 md:gap-8 lg:grid-cols-4 lg:gap-6">
            <div
              aria-hidden
              className="absolute bottom-4 left-5 top-4 w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent md:hidden"
            />
            {steps.map((step, index) => (
              <li
                key={step}
                className="relative flex gap-4 rounded-2xl border border-transparent p-4 active:bg-muted/40 md:block md:rounded-none md:border-0 md:p-0 md:active:bg-transparent"
              >
                <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-md shadow-primary/25">
                  {index + 1}
                </div>
                <div className="min-w-0 pb-6 md:pb-0">
                  <h3 className="text-base font-semibold leading-snug sm:text-lg">
                    {t(`howItWorks.${step}.title`)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t(`howItWorks.${step}.description`)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <MarketingCompare />

      {/* Corridors */}
      <section
        id="corridors"
        className="scroll-mt-16 border-y bg-gradient-to-b from-muted/40 to-muted/20 py-14 sm:scroll-mt-20 sm:py-24"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl sm:mx-auto sm:text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">{t("corridors.title")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:mt-4 sm:text-base">
              {t("corridors.subtitle")}
            </p>
          </div>

          <div className="marketing-scroll-x -mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:mt-14 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
            {corridors.map(({ key, flag }) => (
              <div
                key={key}
                className="w-[72vw] max-w-[16rem] shrink-0 snap-center rounded-2xl border border-border bg-card p-5 shadow-md sm:w-auto sm:max-w-none sm:shadow-sm"
              >
                <span className="text-4xl" aria-hidden>
                  {flag}
                </span>
                <h3 className="mt-3 text-lg font-semibold">{t(`corridors.${key}`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t(`corridors.${key}Detail`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MarketingTestimonials />

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-16 py-14 sm:scroll-mt-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl sm:mx-auto sm:text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">{t("pricing.title")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:mt-4 sm:text-base">
              {t("pricing.subtitle")}
            </p>
            <p className="mt-2 text-xs text-muted-foreground lg:hidden">{t("mobile.swipeHint")}</p>
          </div>

          <div className="marketing-scroll-x -mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:mt-14 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0">
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
                    "relative flex w-[82vw] max-w-[20rem] shrink-0 snap-center flex-col sm:w-auto sm:max-w-none",
                    popular && "border-primary shadow-lg ring-2 ring-primary/20"
                  )}
                >
                  {popular ? (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 shadow-sm">
                      {t("pricing.popular")}
                    </Badge>
                  ) : null}
                  <CardHeader className="pb-3">
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
                    <ul className="space-y-2.5 text-sm">
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
                      className="h-11 w-full"
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
      <section className="relative overflow-hidden border-t bg-primary py-14 text-primary-foreground sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]"
        />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">{t("cta.title")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-primary-foreground/90 sm:mt-4 sm:text-base">
            {t("cta.subtitle")}
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-8 h-12 w-full sm:w-auto">
            <Link href={isAuthenticated ? "/dashboard" : "/signup"}>{t("cta.button")}</Link>
          </Button>
          <p className="mt-6 text-xs leading-relaxed text-primary-foreground/80 sm:text-sm">
            {t("cta.contact", { email: SUPPORT_CONTACT_EMAIL })}
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10 sm:py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="mb-8 text-center text-sm text-muted-foreground">{t("footer.tagline")}</p>
          <LegalFooter />
        </div>
      </footer>
    </div>
  );
}
