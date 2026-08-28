import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  runVerificationAndScore,
  generateDiscrepancySummary,
} from "@/lib/verification/verification-engine";

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

  const result = await runVerificationAndScore(shipmentId, user.id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const summary = await generateDiscrepancySummary(shipmentId);

  return NextResponse.json({
    checks_count: result.checksCount,
    discrepancies_count: result.discrepanciesCount,
    overall_score: result.overallScore,
    summary,
  });
}
