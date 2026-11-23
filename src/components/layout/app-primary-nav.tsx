"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppPrimaryNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const shipmentsActive =
    pathname === "/dashboard" || pathname.startsWith("/shipments");
  const analyticsActive = pathname.startsWith("/analytics");

  return (
    <nav
      aria-label={t("primary")}
      className="hidden min-w-0 items-center gap-1 sm:flex"
    >
      <Link
        href="/dashboard"
        className={cn(
          "rounded-md px-2.5 py-1.5 text-sm font-medium",
          shipmentsActive
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
        )}
      >
        {t("shipments")}
      </Link>
      <Link
        href="/analytics"
        className={cn(
          "rounded-md px-2.5 py-1.5 text-sm font-medium",
          analyticsActive
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
        )}
      >
        {t("analytics")}
      </Link>
      <Button asChild size="sm" className="ms-1 h-8">
        <Link href="/shipments/new">
          <Plus className="me-1 h-4 w-4" />
          {t("newShipment")}
        </Link>
      </Button>
    </nav>
  );
}
