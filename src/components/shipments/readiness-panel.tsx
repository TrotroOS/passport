"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { ReadinessPartyConfirmation } from "@/lib/shipments/readiness-confirmation";
import { formatReadinessTimestamp } from "@/lib/shipments/readiness-confirmation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ReadinessPanelProps {
  shipmentId: string;
  ownerConfirmed: boolean;
  brokerConfirmed: boolean;
  ownerDetails: ReadinessPartyConfirmation;
  brokerDetails: ReadinessPartyConfirmation;
  allConfirmed: boolean;
  canOwnerConfirm: boolean;
  canBrokerConfirm: boolean;
}

function ConfirmationMeta({
  detail,
}: {
  detail: ReadinessPartyConfirmation;
}) {
  const t = useTranslations("readinessConfirmation");

  if (!detail.confirmed) return null;

  return (
    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
      {detail.confirmedBy ? (
        <p>{t("confirmedBy", { name: detail.confirmedBy })}</p>
      ) : null}
      {detail.confirmedAt ? (
        <p>{t("confirmedAt", { date: formatReadinessTimestamp(detail.confirmedAt) })}</p>
      ) : null}
    </div>
  );
}

export function ReadinessPanel({
  shipmentId,
  ownerConfirmed,
  brokerConfirmed,
  ownerDetails,
  brokerDetails,
  allConfirmed,
  canOwnerConfirm,
  canBrokerConfirm,
}: ReadinessPanelProps) {
  const router = useRouter();
  const t = useTranslations("readinessConfirmation");
  const tc = useTranslations("common");

  async function confirm(type: "owner" | "broker") {
    const response = await fetch(`/api/shipments/${shipmentId}/confirm-ready`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.error ?? t("confirmFailed"));
      return;
    }
    toast.success(
      type === "owner" ? t("ownerConfirmedToast") : t("brokerConfirmedToast")
    );
    router.refresh();
  }

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle className="text-lg">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {allConfirmed ? t("overallComplete") : t("overallPending")}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">{t("ownerConfirmedLabel")}</span>
              <Badge variant={ownerConfirmed ? "success" : "secondary"}>
                {ownerConfirmed ? tc("yes") : tc("pending")}
              </Badge>
            </div>
            <ConfirmationMeta detail={ownerDetails} />
            {canOwnerConfirm && !ownerConfirmed ? (
              <Button size="sm" className="mt-3" onClick={() => confirm("owner")}>
                <CheckCircle2 className="me-2 h-4 w-4" />
                {t("confirmOwnerReady")}
              </Button>
            ) : null}
          </div>
          <div className="rounded-md border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">{t("brokerConfirmedLabel")}</span>
              <Badge variant={brokerConfirmed ? "success" : "secondary"}>
                {brokerConfirmed ? tc("yes") : tc("pending")}
              </Badge>
            </div>
            <ConfirmationMeta detail={brokerDetails} />
            {canBrokerConfirm && !brokerConfirmed ? (
              <Button size="sm" className="mt-3" onClick={() => confirm("broker")}>
                <CheckCircle2 className="me-2 h-4 w-4" />
                {t("confirmBrokerReady")}
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
