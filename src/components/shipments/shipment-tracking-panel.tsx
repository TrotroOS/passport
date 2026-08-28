"use client";

import { useState } from "react";
import {
  Container,
  MapPin,
  Plus,
  RefreshCw,
  Ship,
  Truck,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { ContainerDetail, ShipmentTrackingEvent } from "@/types/database";
import {
  deriveTrackingStatus,
  type TrackingStatusLabel,
} from "@/lib/tracking/status";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ShipmentTrackingPanelProps {
  shipmentId: string;
  containers: ContainerDetail[];
  events: ShipmentTrackingEvent[];
  canManage?: boolean;
}

const TRACKING_STATUS_KEYS: Record<
  TrackingStatusLabel,
  | "notTracked"
  | "inTransit"
  | "arrivedAtPort"
  | "discharged"
  | "customsClearance"
  | "delivered"
  | "delayed"
> = {
  "Not tracked": "notTracked",
  "In transit": "inTransit",
  "Arrived at port": "arrivedAtPort",
  Discharged: "discharged",
  "Customs clearance": "customsClearance",
  Delivered: "delivered",
  Delayed: "delayed",
};

function statusVariant(status: TrackingStatusLabel) {
  switch (status) {
    case "Delivered":
      return "success" as const;
    case "Delayed":
      return "destructive" as const;
    case "Customs clearance":
    case "Arrived at port":
      return "warning" as const;
    default:
      return "secondary" as const;
  }
}

function eventIcon(eventType: string) {
  switch (eventType) {
    case "vessel_departed":
    case "vessel_arrived":
      return Ship;
    case "delivery":
      return Truck;
    default:
      return Container;
  }
}

export function ShipmentTrackingPanel({
  shipmentId,
  containers: initialContainers,
  events: initialEvents,
  canManage = false,
}: ShipmentTrackingPanelProps) {
  const t = useTranslations("tracking");
  const te = useTranslations("events");
  const tc = useTranslations("common");
  const [containers, setContainers] = useState(initialContainers);
  const [events, setEvents] = useState(initialEvents);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    container_number: "",
    bill_of_lading_number: "",
    carrier: "",
    vessel_name: "",
    container_type: "",
    seal_number: "",
    voyage_number: "",
  });

  const currentStatus = deriveTrackingStatus(events);
  const localizedStatus = t(TRACKING_STATUS_KEYS[currentStatus]);

  function localizedEventType(eventType: string): string {
    try {
      return te(eventType as "vessel_departed");
    } catch {
      return eventType
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    }
  }

  async function refreshTracking() {
    setIsRefreshing(true);
    try {
      const response = await fetch(
        `/api/shipments/${shipmentId}/tracking/refresh`,
        { method: "POST" }
      );
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? t("refreshFailed"));
        return;
      }

      const eventsResponse = await fetch(
        `/api/shipments/${shipmentId}/tracking-events`
      );
      const eventsData = await eventsResponse.json();
      if (eventsResponse.ok) {
        setEvents(eventsData.events ?? []);
      }

      toast.success(t("refreshSuccess", { count: data.inserted ?? 0 }));
      if (data.inserted > 0) {
        window.location.reload();
      }
    } catch {
      toast.error(t("refreshFailed"));
    } finally {
      setIsRefreshing(false);
    }
  }

  async function submitContainer(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/shipments/${shipmentId}/containers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? t("addFailed"));
        return;
      }

      setContainers((prev) => {
        const exists = prev.some((c) => c.id === data.container.id);
        if (exists) {
          return prev.map((c) =>
            c.id === data.container.id ? data.container : c
          );
        }
        return [...prev, data.container];
      });

      if (data.tracking?.inserted) {
        const eventsResponse = await fetch(
          `/api/shipments/${shipmentId}/tracking-events`
        );
        const eventsData = await eventsResponse.json();
        if (eventsResponse.ok) {
          setEvents(eventsData.events ?? []);
        }
      }

      toast.success(t("containerAdded"));
      setShowAddForm(false);
      setForm({
        container_number: "",
        bill_of_lading_number: "",
        carrier: "",
        vessel_name: "",
        container_type: "",
        seal_number: "",
        voyage_number: "",
      });
      window.location.reload();
    } catch {
      toast.error(t("addFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const sortedEvents = [...events].sort((a, b) => {
    const dateA = a.event_date ? new Date(a.event_date).getTime() : 0;
    const dateB = b.event_date ? new Date(b.event_date).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <Card className="min-w-0 overflow-hidden lg:col-span-2">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Ship className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">{t("title")}</CardTitle>
            </div>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant(currentStatus)}>{localizedStatus}</Badge>
            {canManage ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshTracking}
                  disabled={isRefreshing || containers.length === 0}
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  {t("refreshTracking")}
                </Button>
                <Button size="sm" onClick={() => setShowAddForm((v) => !v)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("addContainer")}
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {canManage && showAddForm ? (
          <form
            onSubmit={submitContainer}
            className="rounded-lg border bg-slate-50 p-4"
          >
            <h3 className="mb-3 text-sm font-semibold">{t("addContainerTitle")}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="container_number">{t("containerNumber")} *</Label>
                <Input
                  id="container_number"
                  required
                  value={form.container_number}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      container_number: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="MSCU1234567"
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="bill_of_lading_number">{t("billOfLading")}</Label>
                <Input
                  id="bill_of_lading_number"
                  value={form.bill_of_lading_number}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      bill_of_lading_number: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="carrier">{t("carrier")}</Label>
                <Input
                  id="carrier"
                  value={form.carrier}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, carrier: e.target.value }))
                  }
                  placeholder="Maersk"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vessel_name">{t("vessel")}</Label>
                <Input
                  id="vessel_name"
                  value={form.vessel_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, vessel_name: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="container_type">{t("containerType")}</Label>
                <Input
                  id="container_type"
                  value={form.container_type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, container_type: e.target.value }))
                  }
                  placeholder="40ft HC"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="seal_number">{t("seal")}</Label>
                <Input
                  id="seal_number"
                  value={form.seal_number}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, seal_number: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t("saving") : t("saveAndTrack")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAddForm(false)}
              >
                {tc("cancel")}
              </Button>
            </div>
          </form>
        ) : null}

        <div>
          <h3 className="mb-3 text-sm font-semibold">{t("containers")}</h3>
          {containers.length > 0 ? (
            <ul className="space-y-2">
              {containers.map((container) => (
                <li
                  key={container.id}
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono font-medium">
                      {container.container_number}
                    </span>
                    {container.container_type ? (
                      <Badge variant="outline">{container.container_type}</Badge>
                    ) : null}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                    {container.carrier ? (
                      <span>
                        {t("carrierLabel")}: {container.carrier}
                      </span>
                    ) : null}
                    {container.vessel_name ? (
                      <span>
                        {t("vesselLabel")}: {container.vessel_name}
                      </span>
                    ) : null}
                    {container.seal_number ? (
                      <span>
                        {t("sealLabel")}: {container.seal_number}
                      </span>
                    ) : null}
                    {container.bill_of_lading_number ? (
                      <span>
                        {t("blLabel")}: {container.bill_of_lading_number}
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noContainers")}</p>
          )}
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">{t("eventTimeline")}</h3>
          {sortedEvents.length > 0 ? (
            <ol className="relative space-y-0 border-l border-slate-200 pl-6">
              {sortedEvents.map((event) => {
                const Icon = eventIcon(event.event_type);
                return (
                  <li key={event.id} className="relative pb-6 last:pb-0">
                    <span className="absolute -left-[1.65rem] flex h-7 w-7 items-center justify-center rounded-full border bg-white">
                      <Icon className="h-3.5 w-3.5 text-slate-600" />
                    </span>
                    <div className="rounded-md border bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">
                          {localizedEventType(event.event_type)}
                        </span>
                        {event.event_date ? (
                          <span className="text-xs text-muted-foreground">
                            {formatDate(event.event_date)}
                          </span>
                        ) : null}
                      </div>
                      {event.container_number ? (
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          {event.container_number}
                        </p>
                      ) : null}
                      {event.description ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {event.description}
                        </p>
                      ) : null}
                      {event.location ? (
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                          {event.source ? ` · ${t("via")} ${event.source}` : ""}
                        </p>
                      ) : event.source ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t("source")}: {event.source}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noEvents")}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
