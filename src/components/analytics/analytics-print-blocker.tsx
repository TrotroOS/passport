"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const ANALYTICS_PRINT_BLOCK_CLASS = "passport-block-analytics-print";

export function AnalyticsPrintBlocker({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAnalyticsRoute = pathname?.startsWith("/analytics") ?? false;

  useEffect(() => {
    if (!isAnalyticsRoute) return;

    document.body.classList.add(ANALYTICS_PRINT_BLOCK_CLASS);
    document.querySelectorAll(".passport-print-root").forEach((node) => {
      node.remove();
    });
    document.body.classList.remove("passport-print-active");

    return () => {
      document.body.classList.remove(ANALYTICS_PRINT_BLOCK_CLASS);
    };
  }, [isAnalyticsRoute]);

  return <>{children}</>;
}
