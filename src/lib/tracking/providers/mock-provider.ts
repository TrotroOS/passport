import type { TrackingProvider, TrackingProviderEvent } from "../types";

/** Deterministic mock events for development and demos. */
export class MockTrackingProvider implements TrackingProvider {
  readonly name = "mock";

  async getShipmentEvents(
    containerNumber: string,
    billOfLading?: string
  ): Promise<TrackingProviderEvent[]> {
    void billOfLading;
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const suffix = containerNumber.slice(-4).toUpperCase();

    return [
      {
        event_type: "vessel_departed",
        event_date: new Date(now - 12 * day).toISOString(),
        location: "Shanghai, CN",
        description: `Container ${containerNumber} loaded on vessel MV Pacific Endeavour ${suffix}`,
      },
      {
        event_type: "vessel_arrived",
        event_date: new Date(now - 3 * day).toISOString(),
        location: "Tema, GH",
        description: "Vessel arrived at destination port",
      },
      {
        event_type: "container_discharged",
        event_date: new Date(now - 2 * day).toISOString(),
        location: "Tema Port Terminal",
        description: `Container ${containerNumber} discharged from vessel`,
      },
      {
        event_type: "customs_clearance",
        event_date: new Date(now - 1 * day).toISOString(),
        location: "Ghana Customs, Tema",
        description: "Customs clearance in progress",
      },
    ];
  }
}
