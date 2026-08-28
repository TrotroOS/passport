export type TrackingEventType =
  | "vessel_departed"
  | "vessel_arrived"
  | "container_discharged"
  | "customs_clearance"
  | "delivery"
  | "delay"
  | "other";

export interface TrackingEventInput {
  event_type: TrackingEventType;
  event_date: string;
  location?: string;
  description?: string;
}

export interface TrackingProviderEvent extends TrackingEventInput {
  raw?: Record<string, unknown>;
}

export interface TrackingProvider {
  readonly name: string;
  getShipmentEvents(
    containerNumber: string,
    billOfLading?: string
  ): Promise<TrackingProviderEvent[]>;
}

export const SIGNIFICANT_TRACKING_EVENT_TYPES: TrackingEventType[] = [
  "vessel_arrived",
  "container_discharged",
  "customs_clearance",
  "delivery",
  "delay",
];
