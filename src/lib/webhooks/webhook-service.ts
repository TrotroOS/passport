import { createAdminClient } from "@/lib/supabase/admin";
import { buildWebhookHeaders } from "./signing";

export const WEBHOOK_EVENTS = [
  "shipment.created",
  "shipment.updated",
  "document.uploaded",
  "document.processed",
  "verification.completed",
  "regulatory.completed",
  "risk.completed",
  "workflow.task_updated",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[number];

export interface WebhookPayload {
  event_type: WebhookEventType;
  timestamp: string;
  shipment_id?: string;
  organization_id: string;
  data: Record<string, unknown>;
}

function signPayload(payload: string, secret: string): ReturnType<typeof buildWebhookHeaders> {
  return buildWebhookHeaders(payload, secret);
}

async function deliverWebhook(
  webhookId: string,
  url: string,
  secret: string,
  payload: WebhookPayload,
  attempt = 0
): Promise<void> {
  const admin = createAdminClient();
  const body = JSON.stringify(payload);
  const { signature, timestamp, nonce } = signPayload(body, secret);

  let status: "success" | "failed" | "retrying" = "failed";
  let responseCode: number | null = null;
  let errorMessage: string | null = null;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Passport-Signature": signature,
        "X-Passport-Timestamp": timestamp,
        "X-Passport-Nonce": nonce,
        "X-Passport-Event": payload.event_type,
      },
      body,
      signal: AbortSignal.timeout(10000),
    });

    responseCode = response.status;
    if (response.ok) {
      status = "success";
    } else {
      errorMessage = `HTTP ${response.status}`;
      if (attempt < 3) status = "retrying";
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Delivery failed";
    if (attempt < 3) status = "retrying";
  }

  const { data: delivery } = await admin
    .from("webhook_deliveries")
    .insert({
      webhook_id: webhookId,
      event_type: payload.event_type,
      payload,
      status,
      response_code: responseCode,
      error_message: errorMessage,
    })
    .select("id")
    .single();

  if (status === "retrying" && attempt < 3) {
    const delayMs = Math.pow(2, attempt) * 1000;
    setTimeout(() => {
      deliverWebhook(webhookId, url, secret, payload, attempt + 1).catch(
        (err) => console.error("[Webhook] Retry failed:", err)
      );
    }, delayMs);

    if (delivery?.id) {
      await admin
        .from("webhook_deliveries")
        .update({ status: "retrying" })
        .eq("id", delivery.id);
    }
  }
}

export async function registerWebhook(
  orgId: string,
  url: string,
  events: string[],
  secret?: string
): Promise<{ id: string; secret: string }> {
  const { randomBytes } = await import("crypto");
  const admin = createAdminClient();
  const webhookSecret = secret ?? randomBytes(32).toString("hex");

  const { data, error } = await admin
    .from("webhook_subscriptions")
    .insert({
      organization_id: orgId,
      url,
      events,
      secret: webhookSecret,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to register webhook");
  }

  return { id: data.id, secret: webhookSecret };
}

export async function dispatchWebhook(
  orgId: string,
  eventType: WebhookEventType,
  data: Record<string, unknown>
): Promise<void> {
  const admin = createAdminClient();

  const { data: subscriptions } = await admin
    .from("webhook_subscriptions")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true);

  if (!subscriptions || subscriptions.length === 0) return;

  const payload: WebhookPayload = {
    event_type: eventType,
    timestamp: new Date().toISOString(),
    organization_id: orgId,
    shipment_id: typeof data.shipment_id === "string" ? data.shipment_id : undefined,
    data,
  };

  for (const sub of subscriptions) {
    const events = Array.isArray(sub.events) ? (sub.events as string[]) : [];
    if (!events.includes(eventType) && !events.includes("*")) continue;

    deliverWebhook(sub.id, sub.url, sub.secret, payload).catch((err) => {
      console.error(`[Webhook] Delivery to ${sub.url} failed:`, err);
    });
  }
}

export async function sendTestWebhook(
  orgId: string,
  shipmentId?: string
): Promise<{ dispatched: number }> {
  await dispatchWebhook(orgId, "verification.completed", {
    shipment_id: shipmentId,
    test: true,
    message: "Test webhook from Passport",
  });
  return { dispatched: 1 };
}

export async function retryWebhookDelivery(deliveryId: string): Promise<boolean> {
  const admin = createAdminClient();

  const { data: delivery } = await admin
    .from("webhook_deliveries")
    .select("*, webhook_subscriptions(url, secret)")
    .eq("id", deliveryId)
    .single();

  if (!delivery) return false;

  const sub = delivery.webhook_subscriptions as { url: string; secret: string };

  const payload = delivery.payload as WebhookPayload;
  await deliverWebhook(delivery.webhook_id, sub.url, sub.secret, payload, 0);
  return true;
}
