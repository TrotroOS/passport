import type { TrackingProvider, TrackingProviderEvent } from "../types";

/** Deterministic mock events for development and demos. */
export class MockTrackingProvider implements TrackingProvider {
  readonly name = "mock";

  async getShipmentEvents(
    containerNumber: string,
    billOfLading?: string,
    _context?: import("../types").ContainerTrackingContext
  ): Promise<TrackingProviderEvent[]> {
    void billOfLading;
    void _context;
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const suffix = containerNumber.slice(-4).toUpperCase();

    return [
      {
        event_type: "vessel_departed",
        event_date: new Date(now - 12 * day).toISOString(),
        location: "Shanghai, CN",
        description: `Container ${containerNumber} loaded on vessel MV Pacific Endeavour ${suffix}`,
        raw: { assistive_demo: true },
      },
      {
        event_type: "vessel_arrived",
        event_date: new Date(now - 3 * day).toISOString(),
        location: "Tema, GH",
        description: "Vessel arrived at destination port",
        raw: { assistive_demo: true },
      },
      {
        event_type: "container_discharged",
        event_date: new Date(now - 2 * day).toISOString(),
        location: "Tema Port Terminal",
        description: `Container ${containerNumber} discharged from vessel`,
        raw: { assistive_demo: true },
      },
      {
        event_type: "customs_clearance",
        event_date: new Date(now - 1 * day).toISOString(),
        location: "Ghana Customs, Tema",
        description: "Customs clearance in progress",
        raw: { assistive_demo: true },
      },
    ];
  }
}
