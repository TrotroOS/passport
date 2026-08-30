import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireShipmentPermission } from "@/lib/shipments/shipment-access";
import { runClearanceAutopilot } from "@/lib/customs/clearance-autopilot";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const { id: shipmentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permission = await requireShipmentPermission(
    supabase,
    user.id,
    shipmentId,
    "upload"
  );

  if ("error" in permission) {
    return NextResponse.json({ error: permission.error }, { status: permission.status });
  }

  const result = await runClearanceAutopilot(shipmentId, user.id, {
    processPendingDocuments: true,
    autoClassifyHs: true,
  });

  if (!result.success) {
    return NextResponse.json(
      {
        error: result.error ?? "Clearance autopilot failed",
        clearance_stage: result.stage,
        reasons: result.reasons,
        recommended_actions: result.recommendedActions,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    clearance_stage: result.stage,
    reasons: result.reasons,
    recommended_actions: result.recommendedActions,
    overall_score: result.overallScore,
    regulatory_score: result.regulatoryScore,
    documents_processed: result.documentsProcessed,
    products_classified: result.productsClassified,
  });
}
