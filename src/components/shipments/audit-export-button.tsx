"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface AuditExportButtonProps {
  shipmentId: string;
  shipmentRef: string;
}

export function AuditExportButton({ shipmentId, shipmentRef }: AuditExportButtonProps) {
  const t = useTranslations("export");

  async function handleExport() {
    try {
      const res = await fetch(`/api/shipments/${shipmentId}/audit-export`);
      if (!res.ok) {
        toast.error(t("failed"));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `passport-audit-${shipmentRef.replace(/[^a-zA-Z0-9-_]/g, "_")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("success"));
    } catch {
      toast.error(t("failed"));
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} className="print:hidden">
      <Download className="me-2 h-4 w-4" />
      {t("auditPack")}
    </Button>
  );
}
