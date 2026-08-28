import { Quote } from "lucide-react";
import { getTranslations } from "next-intl/server";

const QUOTES = ["quote1", "quote2", "quote3"] as const;

export async function MarketingTestimonials() {
  const t = await getTranslations("marketing.testimonials");

  return (
    <section id="stories" className="scroll-mt-16 border-b py-14 sm:scroll-mt-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl sm:mx-auto sm:text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">{t("title")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:mt-4 sm:text-base">
            {t("subtitle")}
          </p>
        </div>

        <div className="marketing-scroll-x -mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:mt-14 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0">
          {QUOTES.map((key) => (
            <figure
              key={key}
              className="relative w-[85vw] max-w-sm shrink-0 snap-center rounded-2xl border border-border/80 bg-card p-6 shadow-sm sm:w-auto sm:max-w-none"
            >
              <Quote
                className="h-8 w-8 text-primary/20"
                aria-hidden
              />
              <blockquote className="mt-3 text-sm leading-relaxed text-foreground/90">
                &ldquo;{t(`${key}.text`)}&rdquo;
              </blockquote>
              <figcaption className="mt-4 border-t border-border/60 pt-4">
                <p className="text-sm font-medium">{t(`${key}.role`)}</p>
                <p className="text-xs text-muted-foreground">{t(`${key}.context`)}</p>
              </figcaption>
            </figure>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">{t("disclaimer")}</p>
      </div>
    </section>
  );
}
