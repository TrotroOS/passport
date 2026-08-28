import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateTaskStatus } from "@/lib/workflow/workflow-engine";
import { calculatePassportScore } from "@/lib/verification/verification-engine";
import { requireShipmentPermission } from "@/lib/shipments/shipment-access";
import { workflowTaskStatusSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id: taskId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = workflowTaskStatusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { data: task } = await supabase
    .from("workflow_tasks")
    .select("shipment_id")
    .eq("id", taskId)
    .single();

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const access = await requireShipmentPermission(
    supabase,
    user.id,
    task.shipment_id,
    "edit_tasks"
  );
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const result = await updateTaskStatus(taskId, parsed.data.status, user.id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const scoreResult = await calculatePassportScore(task.shipment_id, user.id);

  return NextResponse.json({
    task: result.task,
    overall_score: scoreResult.overallScore,
  });
}
