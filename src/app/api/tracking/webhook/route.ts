import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { trackingWebhookSchema } from "@/lib/validations";
import { ingestWebhookTrackingEvents } from "@/lib/tracking/tracking-service";

function secretsMatch(expected: string, provided: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function verifyWebhookSecret(request: Request): NextResponse | null {
  const secret = process.env.TRACKING_WEBHOOK_SECRET;
  const isProduction = process.env.NODE_ENV === "production";

  if (!secret) {
    if (isProduction) {
      return NextResponse.json(
        { error: "Tracking webhook is not configured" },
        { status: 503 }
      );
    }
    return null;
  }

  const provided =
    request.headers.get("x-tracking-webhook-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";

  if (!provided || !secretsMatch(secret, provided)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

export async function POST(request: Request) {
  const authError = verifyWebhookSecret(request);
  if (authError) return authError;

  const body = await request.json().catch(() => ({}));
  const parsed = trackingWebhookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid payload" },
      { status: 400 }
    );
  }

  try {
    const result = await ingestWebhookTrackingEvents(
      parsed.data.shipment_id,
      parsed.data.container_number.trim().toUpperCase(),
      parsed.data.events.map((event) => ({
        event_type: event.event_type,
        event_date: event.event_date,
        location: event.location ?? undefined,
        description: event.description ?? undefined,
      })),
      parsed.data.source ?? "webhook"
    );
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to ingest tracking events";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
