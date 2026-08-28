import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditEvent } from "@/lib/audit";
import { requireShipmentPermission } from "@/lib/shipments/shipment-access";
import { confirmReadySchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id: shipmentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = confirmReadySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const permission =
    parsed.data.type === "owner" ? "owner_confirm" : "broker_confirm";

  const access = await requireShipmentPermission(
    supabase,
    user.id,
    shipmentId,
    permission
  );
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const admin = createAdminClient();
  const updates: Record<string, boolean | string> =
    parsed.data.type === "owner"
      ? { owner_confirmed_ready: true }
      : { broker_confirmed_ready: true };

  const { data: shipment, error } = await admin
    .from("shipments")
    .update(updates)
    .eq("id", shipmentId)
    .select("*")
    .single();

  if (error || !shipment) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to confirm readiness" },
      { status: 500 }
    );
  }

  if (
    shipment.owner_confirmed_ready &&
    shipment.broker_confirmed_ready &&
    shipment.status === "in_review"
  ) {
    await admin
      .from("shipments")
      .update({ status: "ready" })
      .eq("id", shipmentId);
    shipment.status = "ready";
  }

  await writeAuditEvent(admin, {
    organizationId: access.shipment.organization_id,
    userId: user.id,
    action:
      parsed.data.type === "owner"
        ? "shipment.owner_confirmed_ready"
        : "shipment.broker_confirmed_ready",
    entityType: "shipment",
    entityId: shipmentId,
    shipmentId,
    metadata: {
      confirmed_by_access: access.level,
      collaborator_role: access.role ?? null,
      collaborator_organization_id: access.userOrganizationId,
    },
  });

  return NextResponse.json({ shipment });
}
