import type {
  ContainerDetail,
  ShipmentTrackingEvent,
  TrackingEventType,
} from "@/types/database";

export type TrackingStatusLabel =
  | "Not tracked"
  | "In transit"
  | "Arrived at port"
  | "Discharged"
  | "Customs clearance"
  | "Delivered"
  | "Delayed";

const STATUS_PRIORITY: Record<TrackingEventType, number> = {
  delivery: 6,
  customs_clearance: 5,
  container_discharged: 4,
  vessel_arrived: 3,
  delay: 3,
  vessel_departed: 2,
  other: 1,
};

export function deriveTrackingStatus(
  events: Pick<ShipmentTrackingEvent, "event_type" | "event_date">[]
): TrackingStatusLabel {
  if (events.length === 0) return "Not tracked";

  const sorted = [...events].sort((a, b) => {
    const priorityDiff =
      (STATUS_PRIORITY[b.event_type as TrackingEventType] ?? 0) -
      (STATUS_PRIORITY[a.event_type as TrackingEventType] ?? 0);
    if (priorityDiff !== 0) return priorityDiff;
    const dateA = a.event_date ? new Date(a.event_date).getTime() : 0;
    const dateB = b.event_date ? new Date(b.event_date).getTime() : 0;
    return dateB - dateA;
  });

  const latest = sorted[0]?.event_type as TrackingEventType | undefined;
  const hasDelay = events.some((e) => e.event_type === "delay");

  switch (latest) {
    case "delivery":
      return "Delivered";
    case "customs_clearance":
      return hasDelay ? "Delayed" : "Customs clearance";
    case "container_discharged":
      return hasDelay ? "Delayed" : "Discharged";
    case "vessel_arrived":
      return hasDelay ? "Delayed" : "Arrived at port";
    case "delay":
      return "Delayed";
    case "vessel_departed":
      return "In transit";
    default:
      return "In transit";
  }
}

export function formatTrackingEventType(eventType: string): string {
  return eventType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function trackingEventDedupKey(
  shipmentId: string,
  containerNumber: string | null | undefined,
  eventType: string,
  eventDate: string | null | undefined
): string {
  return [
    shipmentId,
    containerNumber ?? "",
    eventType,
    eventDate ?? "epoch",
  ].join("|");
}

export function hasContainers(containers: ContainerDetail[]): boolean {
  return containers.length > 0;
}
