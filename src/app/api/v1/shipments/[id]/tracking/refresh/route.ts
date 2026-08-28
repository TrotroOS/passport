import { apiSuccess } from "@/lib/api/api-key-auth";
import { requireApiKey } from "@/lib/api/require-api-key";
import { getShipmentForOrg } from "@/lib/api/shipment-service";
import { ApiError, apiErrorResponse } from "@/lib/errors/api-error";
import { fetchTrackingEvents } from "@/lib/tracking/tracking-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const auth = await requireApiKey(_request, "write:shipment");
  if (auth instanceof Response) return auth;

  const { id: shipmentId } = await params;
  const shipment = await getShipmentForOrg(shipmentId, auth.organizationId);

  if (!shipment) {
    return apiErrorResponse(new ApiError("NOT_FOUND", "Shipment not found", 404));
  }

  try {
    const result = await fetchTrackingEvents(shipmentId);
    return apiSuccess(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to refresh tracking";
    return apiErrorResponse(new ApiError("INTERNAL_ERROR", message, 500));
  }
}
