import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditEvent } from "@/lib/audit";
import { apiSuccess } from "@/lib/api/api-key-auth";
import { requireApiKey } from "@/lib/api/require-api-key";
import { listShipmentsForOrg } from "@/lib/api/shipment-service";
import { ApiError, apiErrorResponse } from "@/lib/errors/api-error";
import { dispatchWebhook } from "@/lib/webhooks/webhook-service";
import { createShipmentSchema } from "@/lib/validations";

export async function GET(request: Request) {
  const auth = await requireApiKey(request, "read:shipment");
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const limit = searchParams.get("limit")
    ? parseInt(searchParams.get("limit")!, 10)
    : 50;

  const shipments = await listShipmentsForOrg(auth.organizationId, {
    status,
    limit,
  });

  return apiSuccess({ shipments });
}

export async function POST(request: Request) {
  const auth = await requireApiKey(request, "write:shipment");
  if (auth instanceof Response) return auth;

  const body = await request.json().catch(() => null);
  const parsed = createShipmentSchema.safeParse(body);

  if (!parsed.success) {
    return apiErrorResponse(
      new ApiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message ?? "Invalid input",
        400
      )
    );
  }

  const admin = createAdminClient();
  const { data: shipment, error } = await admin
    .from("shipments")
    .insert({
      organization_id: auth.organizationId,
      shipment_ref: parsed.data.shipment_ref,
      origin_country: parsed.data.origin_country,
      destination_country: parsed.data.destination_country,
      status: "draft",
    })
    .select()
    .single();

  if (error || !shipment) {
    return apiErrorResponse(
      new ApiError("INTERNAL_ERROR", error?.message ?? "Failed to create shipment", 500)
    );
  }

  await writeAuditEvent(admin, {
    organizationId: auth.organizationId,
    action: "shipment.created",
    entityType: "shipment",
    entityId: shipment.id,
    shipmentId: shipment.id,
    metadata: { source: "api_v1", shipment_ref: shipment.shipment_ref },
  });

  dispatchWebhook(auth.organizationId, "shipment.created", {
    shipment_id: shipment.id,
    shipment_ref: shipment.shipment_ref,
  }).catch((err) => console.error("[Webhook] shipment.created failed:", err));

  return apiSuccess({ shipment }, 201);
}
