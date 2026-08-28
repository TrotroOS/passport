"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Activity,
  Bell,
  Calendar,
  CheckCircle2,
  CircleHelp,
  FileText,
  GitBranch,
  MoreHorizontal,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppActionsMenu() {
  const t = useTranslations("nav");
  const [criticalCount, setCriticalCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/analytics/compliance-alerts?dateRange=90d&limit=20")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.alerts) return;
        const count = (data.alerts as Array<{ severity: string }>).filter(
          (a) => a.severity === "critical"
        ).length;
        setCriticalCount(count);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label={t("moreActions")}
        >
          <MoreHorizontal className="h-5 w-5" />
          {criticalCount > 0 ? (
            <span className="absolute end-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
              {criticalCount > 9 ? "9+" : criticalCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>{t("moreActions")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/readiness" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {t("readiness")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/compliance/calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t("calendar")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/compliance-alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            {t("complianceAlerts")}
            {criticalCount > 0 ? (
              <span className="ms-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-medium text-destructive-foreground">
                {criticalCount}
              </span>
            ) : null}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/analytics/governance" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            {t("dataGovernance")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/analytics/network" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            {t("tradeNetwork")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/help" className="flex items-center gap-2">
            <CircleHelp className="h-4 w-4" />
            {t("help")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/legal" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t("legal")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            {t("activity")}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
