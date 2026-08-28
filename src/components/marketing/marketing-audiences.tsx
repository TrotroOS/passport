import { Building2, Scale, Truck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { MarketingReveal } from "@/components/marketing/marketing-reveal";

const AUDIENCES = [
  { key: "importers", icon: Building2 },
  { key: "brokers", icon: Scale },
  { key: "forwarders", icon: Truck },
] as const;

export async function MarketingAudiences() {
  const t = await getTranslations("marketing.audiences");

  return (
    <section id="audiences" className="scroll-mt-16 border-b py-14 sm:scroll-mt-20 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl sm:mx-auto sm:text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">{t("title")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:mt-4 sm:text-base">
            {t("subtitle")}
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:mt-14 md:grid-cols-3">
          {AUDIENCES.map(({ key, icon: Icon }, index) => (
            <MarketingReveal key={key} delay={index * 100}>
              <div className="marketing-card-magic h-full rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="text-lg font-semibold">{t(`${key}.title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t(`${key}.description`)}
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {(["point1", "point2", "point3"] as const).map((point) => (
                  <li key={point} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{t(`${key}.${point}`)}</span>
                  </li>
                ))}
              </ul>
              </div>
            </MarketingReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
