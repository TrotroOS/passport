import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditEvent } from "@/lib/audit";
import { apiSuccess } from "@/lib/api/api-key-auth";
import { requireApiKey } from "@/lib/api/require-api-key";
import {
  getFullShipmentAnalysis,
  getShipmentForOrg,
  updateShipmentForOrg,
} from "@/lib/api/shipment-service";
import { ApiError, apiErrorResponse } from "@/lib/errors/api-error";
import { dispatchWebhook } from "@/lib/webhooks/webhook-service";
import { updateShipmentSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireApiKey(request, "read:shipment");
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const shipment = await getShipmentForOrg(id, auth.organizationId);

  if (!shipment) {
    return apiErrorResponse(new ApiError("NOT_FOUND", "Shipment not found", 404));
  }

  const analysis = await getFullShipmentAnalysis(id);

  return apiSuccess({ shipment, analysis });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireApiKey(request, "write:shipment");
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const existing = await getShipmentForOrg(id, auth.organizationId);

  if (!existing) {
    return apiErrorResponse(new ApiError("NOT_FOUND", "Shipment not found", 404));
  }

  const body = await request.json().catch(() => null);
  const parsed = updateShipmentSchema.safeParse(body);

  if (!parsed.success) {
    return apiErrorResponse(
      new ApiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message ?? "Invalid input",
        400
      )
    );
  }

  const shipment = await updateShipmentForOrg(
    id,
    auth.organizationId,
    parsed.data
  );

  if (!shipment) {
    return apiErrorResponse(
      new ApiError("INTERNAL_ERROR", "Failed to update shipment", 500)
    );
  }

  const admin = createAdminClient();
  await writeAuditEvent(admin, {
    organizationId: auth.organizationId,
    action: "shipment.updated",
    entityType: "shipment",
    entityId: shipment.id,
    shipmentId: shipment.id,
    metadata: { source: "api_v1", ...parsed.data },
  });

  dispatchWebhook(auth.organizationId, "shipment.updated", {
    shipment_id: shipment.id,
    shipment_ref: shipment.shipment_ref,
    status: shipment.status,
  }).catch((err) => console.error("[Webhook] shipment.updated failed:", err));

  return apiSuccess({ shipment });
}
