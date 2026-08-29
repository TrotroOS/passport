import type { TrackingProviderEvent } from "../types";

export interface Terminal49ContainerAttributes {
  number?: string;
  pod_arrived_at?: string | null;
  pod_discharged_at?: string | null;
  pod_full_out_at?: string | null;
  final_destination_full_out_at?: string | null;
  empty_terminated_at?: string | null;
  pol_loaded_at?: string | null;
  vessel_departed_at?: string | null;
  vessel_arrived_at?: string | null;
  available_for_pickup?: boolean | null;
  holds_at_pod_terminal?: unknown[] | null;
  fees_at_pod_terminal?: unknown[] | null;
  pickup_lfd?: string | null;
  location_at_pod_terminal?: string | null;
  pod_terminal?: string | null;
  shipping_line_name?: string | null;
}

function pushEvent(
  events: TrackingProviderEvent[],
  event: TrackingProviderEvent | null
): void {
  if (!event?.event_date) return;
  events.push(event);
}

export function mapTerminal49ContainerToEvents(
  attributes: Terminal49ContainerAttributes,
  raw: Record<string, unknown>
): TrackingProviderEvent[] {
  const events: TrackingProviderEvent[] = [];
  const location =
    attributes.location_at_pod_terminal ??
    attributes.pod_terminal ??
    undefined;

  pushEvent(events, attributes.pol_loaded_at || attributes.vessel_departed_at
    ? {
        event_type: "vessel_departed",
        event_date: (attributes.pol_loaded_at ?? attributes.vessel_departed_at)!,
        location,
        description: attributes.shipping_line_name
          ? `Departed origin — ${attributes.shipping_line_name}`
          : "Vessel departed origin port",
        raw,
      }
    : null);

  pushEvent(events, attributes.pod_arrived_at || attributes.vessel_arrived_at
    ? {
        event_type: "vessel_arrived",
        event_date: (attributes.pod_arrived_at ?? attributes.vessel_arrived_at)!,
        location,
        description: "Vessel arrived at destination port",
        raw,
      }
    : null);

  pushEvent(events, attributes.pod_discharged_at
    ? {
        event_type: "container_discharged",
        event_date: attributes.pod_discharged_at,
        location,
        description: "Container discharged at terminal",
        raw,
      }
    : null);

  const hasHolds =
    Array.isArray(attributes.holds_at_pod_terminal) &&
    attributes.holds_at_pod_terminal.length > 0;
  const hasFees =
    Array.isArray(attributes.fees_at_pod_terminal) &&
    attributes.fees_at_pod_terminal.length > 0;

  if (hasHolds || hasFees || attributes.available_for_pickup === false) {
    pushEvent(events, {
      event_type: hasHolds ? "delay" : "customs_clearance",
      event_date:
        attributes.pod_discharged_at ??
        attributes.pod_arrived_at ??
        new Date().toISOString(),
      location,
      description: hasHolds
        ? "Terminal hold reported — clearance may be delayed"
        : hasFees
          ? "Terminal fees reported — review before pickup"
          : "Awaiting terminal release / customs clearance",
      raw,
    });
  } else if (attributes.available_for_pickup === true) {
    pushEvent(events, {
      event_type: "customs_clearance",
      event_date:
        attributes.pod_discharged_at ??
        attributes.pod_arrived_at ??
        new Date().toISOString(),
      location,
      description: "Available for pickup at terminal",
      raw,
    });
  }

  pushEvent(events, attributes.pod_full_out_at
    ? {
        event_type: "delivery",
        event_date: attributes.pod_full_out_at,
        location,
        description: "Container gated out of port terminal",
        raw,
      }
    : null);

  pushEvent(events, attributes.final_destination_full_out_at
    ? {
        event_type: "delivery",
        event_date: attributes.final_destination_full_out_at,
        location,
        description: "Container delivered to final destination",
        raw,
      }
    : null);

  pushEvent(events, attributes.empty_terminated_at
    ? {
        event_type: "delivery",
        event_date: attributes.empty_terminated_at,
        location,
        description: "Empty container returned",
        raw,
      }
    : null);

  return events.sort(
    (a, b) =>
      new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  );
}
