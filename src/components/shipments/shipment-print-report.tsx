"use client";

import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ShipmentPrintReportProps {
  shipmentId: string;
  compact?: boolean;
  className?: string;
}

export function ShipmentPrintReport({
  shipmentId,
  compact = false,
  className,
}: ShipmentPrintReportProps) {
  const t = useTranslations("print");

  function handlePrint() {
    const url = `/api/shipments/${encodeURIComponent(shipmentId)}/compliance-report`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handlePrint}
      className={cn("no-print print:hidden", className)}
      aria-label={compact ? t("printReport") : undefined}
    >
      <Printer className={compact ? "h-4 w-4 shrink-0 sm:me-2" : "me-2 h-4 w-4"} />
      <span className={compact ? "hidden truncate sm:inline" : undefined}>{t("printReport")}</span>
    </Button>
  );
}
