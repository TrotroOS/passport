import type { TrackingProvider, TrackingProviderEvent } from "../types";
import { MockTrackingProvider } from "./mock-provider";

/**
 * VesselFinder-style provider stub. When TRACKING_API_KEY is set, attempts a
 * fetch against TRACKING_API_URL; falls back to mock data on failure.
 */
export class VesselFinderTrackingProvider implements TrackingProvider {
  readonly name = "vesselfinder";
  private readonly apiKey: string;
  private readonly apiUrl: string;
  private readonly fallback = new MockTrackingProvider();

  constructor(apiKey: string, apiUrl?: string) {
    this.apiKey = apiKey;
    this.apiUrl =
      apiUrl?.replace(/\/$/, "") ??
      "https://api.vesselfinder.com/v1/containers";
  }

  async getShipmentEvents(
    containerNumber: string,
    billOfLading?: string
  ): Promise<TrackingProviderEvent[]> {
    if (!this.apiKey) {
      return this.fallback.getShipmentEvents(containerNumber, billOfLading);
    }

    try {
      const params = new URLSearchParams({
        container: containerNumber,
        ...(billOfLading ? { bl: billOfLading } : {}),
      });
      const response = await fetch(`${this.apiUrl}?${params}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        console.warn(
          `[Tracking] VesselFinder HTTP ${response.status}, using mock fallback`
        );
        return this.fallback.getShipmentEvents(containerNumber, billOfLading);
      }

      const payload = (await response.json()) as {
        events?: Array<{
          type?: string;
          date?: string;
          location?: string;
          description?: string;
        }>;
      };

      if (!payload.events?.length) {
        return this.fallback.getShipmentEvents(containerNumber, billOfLading);
      }

      return payload.events.map((event) => ({
        event_type: mapExternalEventType(event.type),
        event_date: event.date ?? new Date().toISOString(),
        location: event.location,
        description: event.description,
        raw: event as Record<string, unknown>,
      }));
    } catch (err) {
      console.warn("[Tracking] VesselFinder request failed, using mock:", err);
      return this.fallback.getShipmentEvents(containerNumber, billOfLading);
    }
  }
}

function mapExternalEventType(type?: string): TrackingProviderEvent["event_type"] {
  const normalized = (type ?? "").toLowerCase().replace(/\s+/g, "_");
  const allowed: TrackingProviderEvent["event_type"][] = [
    "vessel_departed",
    "vessel_arrived",
    "container_discharged",
    "customs_clearance",
    "delivery",
    "delay",
    "other",
  ];
  return allowed.includes(normalized as TrackingProviderEvent["event_type"])
    ? (normalized as TrackingProviderEvent["event_type"])
    : "other";
}
