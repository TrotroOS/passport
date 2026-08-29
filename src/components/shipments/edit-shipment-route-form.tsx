"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CorridorCountrySelect } from "@/components/shipments/corridor-country-select";
import {
  describeImportCorridor,
  normalizeDestinationCountry,
} from "@/lib/regulatory/jurisdiction";

interface EditShipmentRouteFormProps {
  shipmentId: string;
  originCountry: string | null;
  destinationCountry: string | null;
  compact?: boolean;
}

export function EditShipmentRouteForm({
  shipmentId,
  originCountry,
  destinationCountry,
  compact = false,
}: EditShipmentRouteFormProps) {
  const router = useRouter();
  const t = useTranslations("shipment.route");
  const corridor = describeImportCorridor(destinationCountry);
  const [open, setOpen] = useState(!corridor.supported);
  const [origin, setOrigin] = useState(originCountry ?? "");
  const [destination, setDestination] = useState(
    normalizeDestinationCountry(destinationCountry) ?? ""
  );
  const [saving, setSaving] = useState(false);

  async function saveRoute() {
    if (!destination.trim()) {
      toast.error(t("destinationRequired"));
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/shipments/${shipmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin_country: origin.trim() || null,
          destination_country: destination.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? t("saveFailed"));
        return;
      }
      toast.success(t("saved"));
      setOpen(false);
      router.refresh();
    } catch {
      toast.error(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-auto px-2 py-1 text-xs text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Pencil className="me-1 h-3 w-3" />
        {t("editRoute")}
      </Button>
    );
  }

  return (
    <div
      className={
        compact
          ? "space-y-3"
          : "rounded-md border bg-slate-50 p-3 space-y-3"
      }
    >
      {!compact ? <p className="text-sm font-medium">{t("title")}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`origin-${shipmentId}`}>{t("originLabel")}</Label>
          <Input
            id={`origin-${shipmentId}`}
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder={t("originPlaceholder")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`destination-${shipmentId}`}>{t("destinationLabel")}</Label>
          <CorridorCountrySelect
            id={`destination-${shipmentId}`}
            value={destination}
            onChange={setDestination}
            placeholder={t("destinationPlaceholder")}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={saveRoute} disabled={saving}>
          {saving ? t("saving") : t("saveRoute")}
        </Button>
        {corridor.supported ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
