"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MarketingStickyCtaProps {
  isAuthenticated: boolean;
}

export function MarketingStickyCta({ isAuthenticated }: MarketingStickyCtaProps) {
  const t = useTranslations("marketing");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 480);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md transition-transform duration-300 md:hidden",
        visible ? "translate-y-0" : "translate-y-full"
      )}
    >
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{t("stickyCta.title")}</p>
          <p className="truncate text-xs text-muted-foreground">{t("stickyCta.subtitle")}</p>
        </div>
        <Button asChild size="sm" className="shrink-0 px-5">
          <Link href={isAuthenticated ? "/dashboard" : "/signup"}>
            {isAuthenticated ? t("nav.dashboard") : t("hero.primaryCta")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
