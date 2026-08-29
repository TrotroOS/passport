import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runRegulatoryEngine } from "@/lib/regulatory/regulatory-engine";
import { recalculateTasks } from "@/lib/workflow/workflow-engine";
import { calculatePassportScore } from "@/lib/verification/verification-engine";

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

  const { data: shipment } = await supabase
    .from("shipments")
    .select("id")
    .eq("id", shipmentId)
    .single();

  if (!shipment) {
    return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
  }

  const result = await runRegulatoryEngine(shipmentId, user.id);
  if (!result.success) {
    const message =
      result.error === "unsupported_corridor"
        ? "Regulatory checks are available for Ghana, Nigeria, and Kenya import corridors only."
        : result.error ?? "Regulatory check failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const taskResult = await recalculateTasks(shipmentId);
  const scoreResult = await calculatePassportScore(shipmentId, user.id);

  return NextResponse.json({
    checks_count: result.checksCount,
    failed_count: result.failedCount,
    regulatory_score: result.regulatoryScore,
    overall_score: scoreResult.overallScore,
    tasks: taskResult,
  });
}
