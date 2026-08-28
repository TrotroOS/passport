import { apiSuccess } from "@/lib/api/api-key-auth";
import { requireApiKey } from "@/lib/api/require-api-key";
import { getShipmentForOrg } from "@/lib/api/shipment-service";
import { ApiError, apiErrorResponse } from "@/lib/errors/api-error";
import { runCompliancePipeline } from "@/lib/verification/verification-engine";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireApiKey(request, "write:verify");
  if (auth instanceof Response) return auth;

  const { id: shipmentId } = await params;
  const shipment = await getShipmentForOrg(shipmentId, auth.organizationId);

  if (!shipment) {
    return apiErrorResponse(new ApiError("NOT_FOUND", "Shipment not found", 404));
  }

  const result = await runCompliancePipeline(shipmentId);

  if (!result.success) {
    return apiErrorResponse(
      new ApiError("INTERNAL_ERROR", result.error ?? "Verification failed", 500)
    );
  }

  return apiSuccess({
    checks_count: result.checksCount,
    discrepancies_count: result.discrepanciesCount,
    overall_score: result.overallScore,
    regulatory_score: result.regulatoryScore,
  });
}
