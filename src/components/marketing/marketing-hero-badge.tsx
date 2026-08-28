"use client";

import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MarketingHeroBadgeProps {
  children: React.ReactNode;
}

export function MarketingHeroBadge({ children }: MarketingHeroBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className="marketing-shimmer-badge relative mb-4 inline-flex overflow-hidden border-blue-200 bg-blue-100 px-3 py-1.5 font-medium text-blue-800 sm:mb-6"
    >
      <Sparkles className="me-1.5 h-3.5 w-3.5 shrink-0 text-blue-600 motion-safe:animate-pulse" aria-hidden />
      {children}
    </Badge>
  );
}
