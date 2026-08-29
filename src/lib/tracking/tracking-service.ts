import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditEvent } from "@/lib/audit";
import type { ContainerDetail, ShipmentTrackingEvent } from "@/types/database";
import { createTrackingProvider } from "./providers";
import { Terminal49TrackingProvider } from "./providers/terminal49-provider";
import { inferCarrierScac } from "./terminal49/client";
import { shouldRunScheduledTrackingRefresh } from "./config";
import type { ContainerTrackingContext } from "./types";
import {
  extractContainersFromBolData,
  normalizeContainerNumber,
} from "./extract-containers-from-bol";
import {
  sendTrackingEventNotification,
  sendTrackingWhatsAppNotification,
  buildTrackingWhatsAppMessage,
} from "./notify-tracking-event";
import { formatTrackingEventType } from "./status";
import {
  SIGNIFICANT_TRACKING_EVENT_TYPES,
  type TrackingProviderEvent,
} from "./types";
import { recalculateTasks } from "@/lib/workflow/workflow-engine";
import { runRiskAssessment } from "@/lib/risk/risk-engine";

export interface AddContainerInput {
  containerNumber: string;
  containerType?: string | null;
  sealNumber?: string | null;
  carrier?: string | null;
  vesselName?: string | null;
  voyageNumber?: string | null;
  billOfLadingNumber?: string | null;
}

export async function listContainersForShipment(
  shipmentId: string
): Promise<ContainerDetail[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("container_details")
    .select("*")
    .eq("shipment_id", shipmentId)
    .order("created_at", { ascending: true });

  return (data ?? []) as ContainerDetail[];
}

export async function listTrackingEventsForShipment(
  shipmentId: string
): Promise<ShipmentTrackingEvent[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("shipment_tracking_events")
    .select("*")
    .eq("shipment_id", shipmentId)
    .order("event_date", { ascending: false, nullsFirst: false });

  return (data ?? []) as ShipmentTrackingEvent[];
}

export async function addContainerToShipment(
  shipmentId: string,
  input: AddContainerInput,
  userId?: string
): Promise<{ container: ContainerDetail; fetchResult?: FetchTrackingResult }> {
  const admin = createAdminClient();
  const containerNumber = normalizeContainerNumber(input.containerNumber);
  const carrierScac =
    inferCarrierScac(input.carrier) ??
    inferCarrierScac(process.env.TRACKING_DEFAULT_SCAC ?? null) ??
    null;

  const { data: shipment } = await admin
    .from("shipments")
    .select("organization_id")
    .eq("id", shipmentId)
    .single();

  if (!shipment) {
    throw new Error("Shipment not found");
  }

  const { data: container, error } = await admin
    .from("container_details")
    .upsert(
      {
        shipment_id: shipmentId,
        container_number: containerNumber,
        container_type: input.containerType ?? null,
        seal_number: input.sealNumber ?? null,
        carrier: input.carrier ?? null,
        carrier_scac: carrierScac,
        vessel_name: input.vesselName ?? null,
        voyage_number: input.voyageNumber ?? null,
        bill_of_lading_number: input.billOfLadingNumber ?? null,
      },
      { onConflict: "shipment_id,container_number" }
    )
    .select()
    .single();

  if (error || !container) {
    throw new Error(error?.message ?? "Failed to save container");
  }

  await writeAuditEvent(admin, {
    organizationId: shipment.organization_id,
    userId,
    action: "tracking.container_added",
    entityType: "container_detail",
    entityId: container.id,
    shipmentId,
    metadata: { container_number: containerNumber },
  });

  const fetchResult = await fetchTrackingEvents(shipmentId, userId);

  return { container: container as ContainerDetail, fetchResult };
}

export interface FetchTrackingResult {
  inserted: number;
  skipped: number;
  provider: string;
  pending?: boolean;
  messages?: string[];
}

export async function fetchTrackingEvents(
  shipmentId: string,
  userId?: string
): Promise<FetchTrackingResult> {
  const admin = createAdminClient();
  const provider = createTrackingProvider();

  const [{ data: shipment }, { data: containers }] = await Promise.all([
    admin.from("shipments").select("*").eq("id", shipmentId).single(),
    admin
      .from("container_details")
      .select("*")
      .eq("shipment_id", shipmentId),
  ]);

  if (!shipment) {
    throw new Error("Shipment not found");
  }

  if (!containers?.length) {
    return { inserted: 0, skipped: 0, provider: provider.name };
  }

  const { data: existingEvents } = await admin
    .from("shipment_tracking_events")
    .select("container_number, event_type, event_date")
    .eq("shipment_id", shipmentId);

  const existingKeys = new Set(
    (existingEvents ?? []).map(
      (e) =>
        `${e.container_number ?? ""}|${e.event_type}|${e.event_date ?? "epoch"}`
    )
  );

  let inserted = 0;
  let skipped = 0;
  const newSignificantEvents: ShipmentTrackingEvent[] = [];
  const messages: string[] = [];
  let anyPending = false;

  for (const container of containers as ContainerDetail[]) {
    const context: ContainerTrackingContext = {
      carrier: container.carrier,
      carrierScac: container.carrier_scac ?? undefined,
      providerContainerId: container.provider_container_id,
      providerTrackingRequestId: container.provider_tracking_request_id,
      providerLastSyncedAt: container.provider_last_synced_at,
    };

    let events: Awaited<
      ReturnType<typeof provider.getShipmentEvents>
    > = [];
    let providerContainerId = container.provider_container_id ?? null;
    let providerTrackingRequestId = container.provider_tracking_request_id ?? null;

    if (provider instanceof Terminal49TrackingProvider) {
      const sync = await provider.syncContainer(
        container.container_number,
        container.bill_of_lading_number ?? undefined,
        context
      );
      events = sync.events;
      providerContainerId = sync.providerContainerId ?? providerContainerId;
      providerTrackingRequestId =
        sync.providerTrackingRequestId ?? providerTrackingRequestId;
      if (sync.pending) anyPending = true;
      if (sync.message) messages.push(`${container.container_number}: ${sync.message}`);
    } else {
      events = await provider.getShipmentEvents(
        container.container_number,
        container.bill_of_lading_number ?? undefined,
        context
      );
    }

    await admin
      .from("container_details")
      .update({
        tracking_provider: provider.name,
        provider_container_id: providerContainerId,
        provider_tracking_request_id: providerTrackingRequestId,
        provider_last_synced_at: new Date().toISOString(),
      })
      .eq("id", container.id);

    for (const event of events) {
      const key = `${container.container_number}|${event.event_type}|${event.event_date ?? "epoch"}`;
      if (existingKeys.has(key)) {
        skipped++;
        continue;
      }

      const { data: row, error } = await admin
        .from("shipment_tracking_events")
        .insert({
          shipment_id: shipmentId,
          container_number: container.container_number,
          event_type: event.event_type,
          event_date: event.event_date,
          location: event.location ?? null,
          description: event.description ?? null,
          source: provider.name,
          raw_data: event.raw ?? {},
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          skipped++;
          existingKeys.add(key);
          continue;
        }
        console.error("[Tracking] Failed to insert event:", error.message);
        continue;
      }

      inserted++;
      existingKeys.add(key);

      if (
        row &&
        SIGNIFICANT_TRACKING_EVENT_TYPES.includes(
          row.event_type as (typeof SIGNIFICANT_TRACKING_EVENT_TYPES)[number]
        )
      ) {
        newSignificantEvents.push(row as ShipmentTrackingEvent);
      }
    }
  }

  if (inserted > 0) {
    await writeAuditEvent(admin, {
      organizationId: shipment.organization_id,
      userId,
      action: "tracking.events_refreshed",
      entityType: "shipment",
      entityId: shipmentId,
      shipmentId,
      metadata: { inserted, skipped, provider: provider.name },
    });

    await notifyTrackingSubscribers(
      shipmentId,
      shipment.shipment_ref,
      shipment.organization_id,
      newSignificantEvents
    );

    await recalculateTasks(shipmentId);
    await runRiskAssessment(shipmentId, userId);
  }

  return {
    inserted,
    skipped,
    provider: provider.name,
    pending: anyPending,
    messages: messages.length ? messages : undefined,
  };
}

async function notifyTrackingSubscribers(
  shipmentId: string,
  shipmentRef: string,
  organizationId: string,
  events: ShipmentTrackingEvent[]
): Promise<void> {
  if (events.length === 0) return;

  const admin = createAdminClient();

  const [{ data: orgUsers }, { data: collaborators }] = await Promise.all([
    admin
      .from("users")
      .select("id, email, phone, preferred_language, notification_preferences")
      .eq("organization_id", organizationId),
    admin
      .from("shipment_collaborators")
      .select("user_id, users(id, email, phone, preferred_language, notification_preferences)")
      .eq("shipment_id", shipmentId)
      .eq("status", "active"),
  ]);

  const recipients = new Map<
    string,
    { email: string; phone: string | null; locale: string; userId?: string }
  >();

  for (const user of orgUsers ?? []) {
    if (user.email) {
      recipients.set(user.email, {
        email: user.email,
        phone: user.phone,
        locale: user.preferred_language ?? "en",
        userId: user.id,
      });
    }
  }

  for (const collab of collaborators ?? []) {
    const user = collab.users as {
      id?: string;
      email?: string;
      phone?: string | null;
      preferred_language?: string | null;
    } | null;
    if (user?.email) {
      recipients.set(user.email, {
        email: user.email,
        phone: user.phone ?? null,
        locale: user.preferred_language ?? "en",
        userId: user.id,
      });
    }
  }

  for (const event of events) {
    const label = formatTrackingEventType(event.event_type);
    for (const { email, phone, locale, userId } of Array.from(recipients.values())) {
      try {
        await sendTrackingEventNotification({
          recipientEmail: email,
          shipmentRef,
          eventType: label,
          eventDescription: event.description ?? label,
          eventLocation: event.location,
          eventDate: event.event_date,
          shipmentId,
          locale,
          userId,
        });
      } catch (err) {
        console.error("[Tracking] Email notification failed:", err);
      }

      if (phone) {
        try {
          await sendTrackingWhatsAppNotification(
            phone,
            buildTrackingWhatsAppMessage(
              locale,
              shipmentRef,
              event.event_type,
              event.description ?? label
            )
          );
        } catch (err) {
          console.error("[Tracking] WhatsApp notification failed:", err);
        }
      }
    }
  }
}

export async function syncContainersFromBolExtraction(
  shipmentId: string,
  extractedData: Record<string, unknown>,
  userId?: string
): Promise<{ created: number }> {
  const bol = extractContainersFromBolData(extractedData);
  if (!bol.container_numbers?.length) {
    return { created: 0 };
  }

  const admin = createAdminClient();
  let created = 0;

  for (const containerNumber of bol.container_numbers) {
    const normalized = normalizeContainerNumber(containerNumber);
    const { data: existing } = await admin
      .from("container_details")
      .select("id")
      .eq("shipment_id", shipmentId)
      .eq("container_number", normalized)
      .maybeSingle();

    if (existing) continue;

    const { error } = await admin.from("container_details").insert({
      shipment_id: shipmentId,
      container_number: normalized,
      carrier: bol.carrier,
      carrier_scac: inferCarrierScac(bol.carrier) ?? null,
      vessel_name: bol.vessel,
      voyage_number: bol.voyage_number,
      bill_of_lading_number: bol.bill_of_lading_number,
    });

    if (!error) created++;
  }

  if (created > 0) {
    await fetchTrackingEvents(shipmentId, userId);
  }

  return { created };
}

export async function refreshAllTracking(): Promise<{
  shipmentsProcessed: number;
  totalInserted: number;
  skipped?: boolean;
  reason?: string;
}> {
  if (!shouldRunScheduledTrackingRefresh()) {
    return {
      shipmentsProcessed: 0,
      totalInserted: 0,
      skipped: true,
      reason: "Scheduled refresh runs only when TRACKING_PROVIDER=terminal49 and TRACKING_API_KEY is set",
    };
  }

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("container_details")
    .select("shipment_id");

  const candidateIds = Array.from(
    new Set((rows ?? []).map((r) => r.shipment_id as string))
  );

  const { data: activeShipments } = await admin
    .from("shipments")
    .select("id")
    .in("id", candidateIds.length ? candidateIds : ["00000000-0000-0000-0000-000000000000"])
    .neq("status", "archived");

  const shipmentIds = (activeShipments ?? []).map((s) => s.id as string);
  let totalInserted = 0;

  for (const shipmentId of shipmentIds) {
    try {
      const result = await fetchTrackingEvents(shipmentId);
      totalInserted += result.inserted;
    } catch (err) {
      console.error(`[Tracking] refresh failed for ${shipmentId}:`, err);
    }
  }

  return { shipmentsProcessed: shipmentIds.length, totalInserted };
}

export async function ingestWebhookTrackingEvents(
  shipmentId: string,
  containerNumber: string,
  events: TrackingProviderEvent[],
  source: string
): Promise<FetchTrackingResult> {
  const admin = createAdminClient();
  const { data: shipment } = await admin
    .from("shipments")
    .select("organization_id, shipment_ref")
    .eq("id", shipmentId)
    .single();

  if (!shipment) {
    throw new Error("Shipment not found");
  }

  const { data: existingEvents } = await admin
    .from("shipment_tracking_events")
    .select("container_number, event_type, event_date")
    .eq("shipment_id", shipmentId);

  const existingKeys = new Set(
    (existingEvents ?? []).map(
      (e) =>
        `${e.container_number ?? ""}|${e.event_type}|${e.event_date ?? "epoch"}`
    )
  );

  let inserted = 0;
  let skipped = 0;
  const newSignificantEvents: ShipmentTrackingEvent[] = [];

  for (const event of events) {
    const key = `${containerNumber}|${event.event_type}|${event.event_date ?? "epoch"}`;
    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }

    const { data: row, error } = await admin
      .from("shipment_tracking_events")
      .insert({
        shipment_id: shipmentId,
        container_number: containerNumber,
        event_type: event.event_type,
        event_date: event.event_date,
        location: event.location ?? null,
        description: event.description ?? null,
        source,
        raw_data: event.raw ?? {},
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        skipped++;
        continue;
      }
      throw new Error(error.message);
    }

    inserted++;
    if (
      row &&
      SIGNIFICANT_TRACKING_EVENT_TYPES.includes(
        row.event_type as (typeof SIGNIFICANT_TRACKING_EVENT_TYPES)[number]
      )
    ) {
      newSignificantEvents.push(row as ShipmentTrackingEvent);
    }
  }

  if (inserted > 0) {
    await notifyTrackingSubscribers(
      shipmentId,
      shipment.shipment_ref,
      shipment.organization_id,
      newSignificantEvents
    );
    await recalculateTasks(shipmentId);
    await runRiskAssessment(shipmentId);
  }

  return { inserted, skipped, provider: source };
}
