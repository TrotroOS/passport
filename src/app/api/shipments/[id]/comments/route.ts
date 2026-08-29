import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditEvent } from "@/lib/audit";
import { notifyCollaborationComment } from "@/lib/collaboration/notify-comment";
import { loadShipmentComments } from "@/lib/shipments/load-shipment-comments";
import { requireShipmentPermission } from "@/lib/shipments/shipment-access";
import { createShipmentCommentSchema } from "@/lib/validations";
import { getOrganizationIdForUser } from "@/lib/auth/get-organization-id";

interface RouteParams {
  params: Promise<{ id: string }>;
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

  const access = await requireShipmentPermission(
    supabase,
    user.id,
    shipmentId,
    "view"
  );
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const admin = createAdminClient();
  const comments = await loadShipmentComments(admin, shipmentId);

  return NextResponse.json({ comments });
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

  const access = await requireShipmentPermission(
    supabase,
    user.id,
    shipmentId,
    "comment"
  );
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = createShipmentCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const organizationId = await getOrganizationIdForUser(supabase, user.id);
  if (!organizationId) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: comment, error } = await admin
    .from("shipment_comments")
    .insert({
      shipment_id: shipmentId,
      user_id: user.id,
      organization_id: organizationId,
      body: parsed.data.body,
    })
    .select("*, users(id, email, full_name), organizations(id, name)")
    .single();

  if (error || !comment) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to add comment" },
      { status: 500 }
    );
  }

  await writeAuditEvent(admin, {
    organizationId: access.shipment.organization_id,
    userId: user.id,
    action: "collaborator.comment_added",
    entityType: "shipment_comment",
    entityId: comment.id,
    shipmentId,
    metadata: {
      commenter_organization_id: organizationId,
      access_level: access.level,
      collaborator_role: access.role ?? null,
    },
  });

  const commentUsers = comment.users as
    | { email: string; full_name: string | null }
    | null
    | undefined;
  const commenterName =
    commentUsers?.full_name ?? commentUsers?.email ?? "A collaborator";

  if (access.level !== "owner") {
    void notifyCollaborationComment(admin, {
      organizationId: access.shipment.organization_id,
      shipmentId,
      shipmentRef: access.shipment.shipment_ref,
      commenterUserId: user.id,
      commenterName,
      commentPreview: parsed.data.body,
    });
  }

  revalidatePath(`/shipments/${shipmentId}`);

  return NextResponse.json({ comment }, { status: 201 });
}
