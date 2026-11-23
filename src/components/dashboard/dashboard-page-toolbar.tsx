"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { FeedbackButton } from "@/components/feedback/feedback-button";
import { Button } from "@/components/ui/button";

export function DashboardPageToolbar() {
  const tNav = useTranslations("nav");

  return (
    <div className="flex w-full min-w-0 flex-col gap-3 sm:gap-2 md:w-auto md:items-end">
      <Button asChild className="h-10 w-full shrink-0 sm:hidden">
        <Link href="/shipments/new">
          <Plus className="me-2 h-4 w-4 shrink-0" />
          <span className="truncate">{tNav("newShipment")}</span>
        </Link>
      </Button>

      <div className="flex min-w-0 flex-wrap items-stretch gap-2">
        <div className="min-w-0 flex-1 sm:flex-none">
          <FeedbackButton compact className="w-full sm:w-auto" />
        </div>
      </div>
    </div>
  );
}
