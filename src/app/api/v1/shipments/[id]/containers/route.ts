import { apiSuccess } from "@/lib/api/api-key-auth";
import { requireApiKey } from "@/lib/api/require-api-key";
import { getShipmentForOrg } from "@/lib/api/shipment-service";
import { ApiError, apiErrorResponse } from "@/lib/errors/api-error";
import { addContainerSchema } from "@/lib/validations";
import {
  addContainerToShipment,
  listContainersForShipment,
} from "@/lib/tracking/tracking-service";

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

  const containers = await listContainersForShipment(shipmentId);
  return apiSuccess({ containers });
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireApiKey(request, "write:shipment");
  if (auth instanceof Response) return auth;

  const { id: shipmentId } = await params;
  const shipment = await getShipmentForOrg(shipmentId, auth.organizationId);

  if (!shipment) {
    return apiErrorResponse(new ApiError("NOT_FOUND", "Shipment not found", 404));
  }

  const body = await request.json().catch(() => ({}));
  const parsed = addContainerSchema.safeParse(body);
  if (!parsed.success) {
    return apiErrorResponse(
      new ApiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message ?? "Invalid input",
        400
      )
    );
  }

  try {
    const result = await addContainerToShipment(
      shipmentId,
      {
        containerNumber: parsed.data.container_number,
        containerType: parsed.data.container_type,
        sealNumber: parsed.data.seal_number,
        carrier: parsed.data.carrier,
        vesselName: parsed.data.vessel_name,
        voyageNumber: parsed.data.voyage_number,
        billOfLadingNumber: parsed.data.bill_of_lading_number,
      },
      undefined
    );

    return apiSuccess(
      {
        container: result.container,
        tracking: result.fetchResult,
      },
      201
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add container";
    return apiErrorResponse(new ApiError("INTERNAL_ERROR", message, 500));
  }
}
