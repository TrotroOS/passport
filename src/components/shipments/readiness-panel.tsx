"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
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
  canOwnerConfirm: boolean;
  canBrokerConfirm: boolean;
}

export function ReadinessPanel({
  shipmentId,
  ownerConfirmed,
  brokerConfirmed,
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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">{t("ownerConfirmedLabel")}</span>
              <Badge variant={ownerConfirmed ? "success" : "secondary"}>
                {ownerConfirmed ? tc("yes") : tc("pending")}
              </Badge>
            </div>
            {canOwnerConfirm && !ownerConfirmed ? (
              <Button size="sm" onClick={() => confirm("owner")}>
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
            {canBrokerConfirm && !brokerConfirmed ? (
              <Button size="sm" onClick={() => confirm("broker")}>
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
