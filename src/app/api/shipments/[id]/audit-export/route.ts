import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireShipmentPermission } from "@/lib/shipments/shipment-access";
import { buildAuditExportCsv } from "@/lib/export/audit-export";
import { writeAuditEvent } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function summarizeMetadata(metadata: Record<string, unknown> | null | undefined): string {
  if (!metadata || Object.keys(metadata).length === 0) return "";
  return Object.entries(metadata)
    .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`)
    .join("; ");
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id: shipmentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await requireShipmentPermission(supabase, user.id, shipmentId, "view");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const admin = createAdminClient();
  const shipment = access.shipment;

  const [
    { data: auditEvents },
    { data: documents },
    { data: verificationChecks },
    { data: discrepancies },
    { data: workflowTasks },
    { data: latestScore },
    { data: organization },
    { data: exporterProfile },
  ] = await Promise.all([
    admin
      .from("audit_events")
      .select("created_at, action, entity_type, entity_id, user_id, metadata")
      .eq("shipment_id", shipmentId)
      .order("created_at", { ascending: false })
      .limit(500),
    admin
      .from("documents")
      .select("doc_type, file_name, status, created_at")
      .eq("shipment_id", shipmentId),
    admin
      .from("verification_checks")
      .select("check_type, status, severity, check_id")
      .eq("shipment_id", shipmentId),
    admin
      .from("discrepancies")
      .select("discrepancy_type, status, severity, description")
      .eq("shipment_id", shipmentId),
    admin
      .from("workflow_tasks")
      .select("title, status, priority, due_date")
      .eq("shipment_id", shipmentId),
    admin
      .from("passport_scores")
      .select("overall_score")
      .eq("shipment_id", shipmentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin.from("organizations").select("name").eq("id", shipment.organization_id).maybeSingle(),
    admin.from("users").select("full_name, email").eq("id", user.id).maybeSingle(),
  ]);

  const actorIds = Array.from(
    new Set((auditEvents ?? []).map((event) => event.user_id).filter(Boolean))
  ) as string[];

  const { data: actorProfiles } =
    actorIds.length > 0
      ? await admin.from("users").select("id, full_name, email").in("id", actorIds)
      : { data: [] as Array<{ id: string; full_name: string | null; email: string | null }> };

  const actorById = new Map(
    (actorProfiles ?? []).map((profile) => [
      profile.id,
      profile.full_name?.trim() || profile.email || profile.id,
    ])
  );

  const enrichedAuditEvents = (auditEvents ?? []).map((event) => ({
    ...event,
    actor: event.user_id ? actorById.get(event.user_id) ?? event.user_id : "System",
    details: summarizeMetadata(event.metadata as Record<string, unknown> | null),
  }));

  const csv = buildAuditExportCsv(
    {
      organizationName: organization?.name ?? "Organization",
      exportedBy: exporterProfile?.full_name?.trim() || exporterProfile?.email || user.email || "User",
    },
    {
      summary: {
        shipment_ref: shipment.shipment_ref,
        status: shipment.status,
        origin: shipment.origin_country,
        destination: shipment.destination_country,
        passport_score: latestScore?.overall_score ?? "",
      },
      auditEvents: enrichedAuditEvents,
      documents: documents ?? [],
      verificationChecks: verificationChecks ?? [],
      discrepancies: discrepancies ?? [],
      workflowTasks: workflowTasks ?? [],
    }
  );

  await writeAuditEvent(admin, {
    organizationId: shipment.organization_id,
    userId: user.id,
    action: "audit.exported",
    entityType: "shipment",
    entityId: shipmentId,
    shipmentId,
    metadata: {
      shipment_ref: shipment.shipment_ref,
      event_count: enrichedAuditEvents.length,
    },
  });

  const filename = `passport-audit-${shipment.shipment_ref.replace(/[^a-zA-Z0-9-_]/g, "_")}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
