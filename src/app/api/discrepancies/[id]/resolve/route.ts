import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeAuditEvent } from "@/lib/audit";
import { calculatePassportScore } from "@/lib/verification/verification-engine";
import { recalculateTasks } from "@/lib/workflow/workflow-engine";
import { discrepancyActionSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function updateDiscrepancyStatus(
  request: Request,
  { params }: RouteParams,
  newStatus: "resolved" | "ignored"
) {
  const { id: discrepancyId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = discrepancyActionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { data: discrepancy } = await supabase
    .from("discrepancies")
    .select("*, shipments(organization_id)")
    .eq("id", discrepancyId)
    .single();

  if (!discrepancy) {
    return NextResponse.json({ error: "Discrepancy not found" }, { status: 404 });
  }

  const { data: updated, error } = await supabase
    .from("discrepancies")
    .update({
      status: newStatus,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", discrepancyId)
    .select()
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to update discrepancy" },
      { status: 500 }
    );
  }

  const shipment = discrepancy.shipments as { organization_id: string };

  await writeAuditEvent(supabase, {
    organizationId: shipment.organization_id,
    userId: user.id,
    action: `discrepancy.${newStatus}`,
    entityType: "discrepancy",
    entityId: discrepancyId,
    shipmentId: discrepancy.shipment_id,
    metadata: {
      discrepancy_type: discrepancy.discrepancy_type,
      resolution_note: parsed.data.resolution_note,
    },
  });

  const scoreResult = await calculatePassportScore(
    discrepancy.shipment_id,
    user.id
  );

  await recalculateTasks(discrepancy.shipment_id);

  return NextResponse.json({
    discrepancy: updated,
    overall_score: scoreResult.overallScore,
  });
}

export async function POST(request: Request, { params }: RouteParams) {
  return updateDiscrepancyStatus(request, { params }, "resolved");
}
