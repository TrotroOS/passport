"use client";

import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";

interface MarketingRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function MarketingReveal({ children, className, delay = 0 }: MarketingRevealProps) {
  const { ref, inView } = useInView(0.12);

  return (
    <div
      ref={ref}
      className={cn(
        "motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out",
        inView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
