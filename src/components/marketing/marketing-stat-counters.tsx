"use client";

import { useEffect, useState } from "react";
import { useInView } from "@/hooks/use-in-view";

import { cn } from "@/lib/utils";

interface StatItem {
  label: string;
  value: string;
}

interface MarketingStatCountersProps {
  stats: StatItem[];
}

function useCountUp(target: number, active: boolean, duration = 1400) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active || target <= 0) return;

    let start: number | null = null;
    let frame = 0;

    const step = (timestamp: number) => {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [active, target, duration]);

  return value;
}

function AnimatedStatValue({ value, active }: { value: string; active: boolean }) {
  const match = value.match(/^(\d+)(.*)$/);
  const numeric = match ? Number.parseInt(match[1], 10) : 0;
  const suffix = match ? match[2] : value;
  const count = useCountUp(numeric, active && numeric > 0);

  if (!match) {
    return <>{value}</>;
  }

  return (
    <>
      {count}
      {suffix}
    </>
  );
}

export function MarketingStatCounters({ stats }: MarketingStatCountersProps) {
  const { ref, inView } = useInView(0.35);

  return (
    <dl
      ref={ref}
      className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-3 sm:mt-16 sm:grid-cols-3 sm:gap-6"
    >
      {stats.map(({ label, value }, index) => (
        <div
          key={label}
          className={cn(
            "marketing-stat-card rounded-2xl border border-border/80 bg-card/60 px-4 py-4 text-center shadow-sm backdrop-blur-sm motion-safe:transition-all motion-safe:duration-500 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none",
            inView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          )}
          style={{ transitionDelay: `${index * 120}ms` }}
        >
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground sm:text-sm sm:normal-case sm:tracking-normal">
            {label}
          </dt>
          <dd className="mt-1 text-3xl font-bold tabular-nums text-primary sm:text-2xl">
            <AnimatedStatValue value={value} active={inView} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
