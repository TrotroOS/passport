import type {
  ContainerTrackingContext,
  TrackingProvider,
  TrackingProviderEvent,
} from "../types";
import {
  Terminal49ApiError,
  Terminal49Client,
  inferCarrierScac,
} from "../terminal49/client";
import {
  mapTerminal49ContainerToEvents,
  type Terminal49ContainerAttributes,
} from "../terminal49/map-events";

export interface Terminal49SyncMetadata {
  providerContainerId?: string | null;
  providerTrackingRequestId?: string | null;
  pending?: boolean;
  message?: string;
}

export class Terminal49TrackingProvider implements TrackingProvider {
  readonly name = "terminal49";
  private readonly client: Terminal49Client;

  constructor(apiKey: string, apiUrl?: string) {
    if (!apiKey.trim()) {
      throw new Error("TRACKING_API_KEY is required for Terminal49 tracking");
    }
    this.client = new Terminal49Client(apiKey, apiUrl);
  }

  async getShipmentEvents(
    containerNumber: string,
    billOfLading?: string,
    context?: ContainerTrackingContext
  ): Promise<TrackingProviderEvent[]> {
    const result = await this.syncContainer(containerNumber, billOfLading, context);
    return result.events;
  }

  async syncContainer(
    containerNumber: string,
    billOfLading?: string,
    context?: ContainerTrackingContext
  ): Promise<Terminal49SyncMetadata & { events: TrackingProviderEvent[] }> {
    const scac =
      context?.carrierScac ??
      inferCarrierScac(context?.carrier ?? null) ??
      inferCarrierScac(process.env.TRACKING_DEFAULT_SCAC ?? null);

    let providerTrackingRequestId = context?.providerTrackingRequestId ?? null;
    let providerContainerId = context?.providerContainerId ?? null;

    if (!providerTrackingRequestId) {
      try {
        const created = await this.client.createTrackingRequest({
          requestType: "container",
          requestNumber: containerNumber,
          scac,
        });
        providerTrackingRequestId = created.id;
      } catch (err) {
        if (
          billOfLading &&
          err instanceof Terminal49ApiError &&
          (err.status === 404 || err.status === 422)
        ) {
          const created = await this.client.createTrackingRequest({
            requestType: "bill_of_lading",
            requestNumber: billOfLading,
            scac,
          });
          providerTrackingRequestId = created.id;
        } else if (
          err instanceof Terminal49ApiError &&
          err.status === 422 &&
          err.body?.includes("already")
        ) {
          // Tracking request may already exist — continue to container lookup.
        } else {
          throw err;
        }
      }
    }

    let container = providerContainerId
      ? { id: providerContainerId, attributes: {} as Terminal49ContainerAttributes }
      : null;

    const listed = await this.client.findContainerByNumber(containerNumber);
    if (listed) {
      providerContainerId = listed.id;
      container = {
        id: listed.id,
        attributes: listed.attributes as Terminal49ContainerAttributes,
      };
    }

    if (!container?.attributes?.pod_arrived_at && providerContainerId) {
      const staleMs = 6 * 60 * 60 * 1000;
      const lastSync = context?.providerLastSyncedAt
        ? new Date(context.providerLastSyncedAt).getTime()
        : 0;
      if (Date.now() - lastSync > staleMs) {
        try {
          await this.client.refreshContainer(providerContainerId);
        } catch (err) {
          console.warn("[Tracking] Terminal49 refresh skipped:", err);
        }
        const refreshed = await this.client.findContainerByNumber(containerNumber);
        if (refreshed) {
          container = {
            id: refreshed.id,
            attributes: refreshed.attributes as Terminal49ContainerAttributes,
          };
        }
      }
    }

    if (!container || !Object.keys(container.attributes).length) {
      return {
        events: [],
        providerContainerId,
        providerTrackingRequestId,
        pending: true,
        message:
          "Tracking registered with Terminal49 — carrier data is still syncing. Try refresh again in a few hours.",
      };
    }

    const events = mapTerminal49ContainerToEvents(
      container.attributes,
      container.attributes as unknown as Record<string, unknown>
    );

    return {
      events,
      providerContainerId,
      providerTrackingRequestId,
      pending: events.length === 0,
      message:
        events.length === 0
          ? "Terminal49 has no milestones yet for this container."
          : undefined,
    };
  }
}
