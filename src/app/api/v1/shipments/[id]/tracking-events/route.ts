import { apiSuccess } from "@/lib/api/api-key-auth";
import { requireApiKey } from "@/lib/api/require-api-key";
import { getShipmentForOrg } from "@/lib/api/shipment-service";
import { ApiError, apiErrorResponse } from "@/lib/errors/api-error";
import { listTrackingEventsForShipment } from "@/lib/tracking/tracking-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireApiKey(request, "read:shipment");
  if (auth instanceof Response) return auth;

  const { id: shipmentId } = await params;
  const shipment = await getShipmentForOrg(shipmentId, auth.organizationId);

  if (!shipment) {
    return apiErrorResponse(new ApiError("NOT_FOUND", "Shipment not found", 404));
  }

  const events = await listTrackingEventsForShipment(shipmentId);
  return apiSuccess({ events });
}
