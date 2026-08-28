"use client";

import { useEffect, useState } from "react";
import { FileCheck2, ShieldCheck, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";

const TARGET_SCORE = 87;
const RING_CIRCUMFERENCE = 88;

function useCountUp(target: number, active: boolean) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;

    let start: number | null = null;
    let frame = 0;
    const duration = 1600;

    const step = (timestamp: number) => {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [active, target]);

  return value;
}

export function MarketingHeroPreview() {
  const t = useTranslations("marketing.heroPreview");
  const { ref, inView } = useInView(0.25);
  const score = useCountUp(TARGET_SCORE, inView);
  const ringOffset = RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * score) / 100;

  return (
    <div ref={ref} className="relative mx-auto mt-10 max-w-sm sm:mt-12 sm:max-w-md lg:max-w-lg">
      <div
        aria-hidden
        className="marketing-orb absolute -left-6 top-8 h-28 w-28 rounded-full bg-primary/20 blur-3xl sm:-left-10"
      />
      <div
        aria-hidden
        className="marketing-orb-delayed absolute -right-4 bottom-4 h-24 w-24 rounded-full bg-emerald-400/20 blur-3xl"
      />

      <div className="marketing-float relative rounded-2xl border border-border/80 bg-card/90 p-4 shadow-xl shadow-primary/10 backdrop-blur-sm sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("shipmentRef")}
            </p>
            <p className="mt-0.5 font-semibold text-foreground">GH-IMP-2026-0042</p>
          </div>
          <span className="marketing-ready-pulse rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            {t("ready")}
          </span>
        </div>

        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">{t("passportScore")}</p>
            <p className="text-4xl font-bold tabular-nums text-primary">{score}</p>
          </div>
          <div className="relative flex h-16 w-16 items-center justify-center">
            <svg
              className="absolute inset-0 -rotate-90"
              viewBox="0 0 36 36"
              aria-hidden
            >
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-primary/15"
              />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={ringOffset}
                className="text-primary motion-safe:transition-[stroke-dashoffset] motion-safe:duration-1000 motion-safe:ease-out"
              />
            </svg>
            <ShieldCheck className="relative h-7 w-7 text-primary" aria-hidden />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { label: t("docs"), value: "6/6", ok: true },
            { label: t("checks"), value: "12", ok: true },
            { label: t("tasks"), value: "1", ok: false },
          ].map((item) => (
            <div
              key={item.label}
              className={cn(
                "rounded-lg px-2 py-2 text-center transition-transform motion-safe:duration-300 hover:scale-[1.03]",
                item.ok ? "bg-primary/5" : "bg-amber-500/10"
              )}
            >
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
              <p className="text-sm font-semibold">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div
        className="marketing-float-delayed absolute -right-2 top-0 w-[42%] rounded-xl border border-border/70 bg-background/95 p-3 shadow-lg sm:-right-4"
        aria-hidden
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4 motion-safe:animate-pulse" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{t("extracted")}</p>
            <p className="truncate text-[10px] text-muted-foreground">{t("invoice")}</p>
          </div>
        </div>
      </div>

      <div
        className="marketing-float absolute -left-1 bottom-2 w-[44%] rounded-xl border border-border/70 bg-background/95 p-3 shadow-lg sm:-left-3"
        aria-hidden
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
            <FileCheck2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{t("verified")}</p>
            <p className="truncate text-[10px] text-muted-foreground">{t("match")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
