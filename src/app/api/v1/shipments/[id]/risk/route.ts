import { createAdminClient } from "@/lib/supabase/admin";
import { apiSuccess } from "@/lib/api/api-key-auth";
import { requireApiKey } from "@/lib/api/require-api-key";
import { getShipmentForOrg } from "@/lib/api/shipment-service";
import { ApiError, apiErrorResponse } from "@/lib/errors/api-error";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireApiKey(request, "read:analysis");
  if (auth instanceof Response) return auth;

  const { id: shipmentId } = await params;
  const shipment = await getShipmentForOrg(shipmentId, auth.organizationId);

  if (!shipment) {
    return apiErrorResponse(new ApiError("NOT_FOUND", "Shipment not found", 404));
  }

  const admin = createAdminClient();
  const [{ data: factors }, { data: assessments }] = await Promise.all([
    admin.from("risk_factors").select("*").eq("shipment_id", shipmentId),
    admin
      .from("risk_assessments")
      .select("*")
      .eq("shipment_id", shipmentId)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  return apiSuccess({
    risk_factors: factors ?? [],
    risk_assessment: assessments?.[0] ?? null,
  });
}
