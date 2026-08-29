import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCollaboratorInvitation } from "@/lib/collaboration/create-collaborator-invitation";
import {
  listCollaboratorsForShipment,
  requireShipmentPermission,
} from "@/lib/shipments/shipment-access";
import {
  inviteCollaboratorSchema,
  inviteCollaboratorsBatchSchema,
} from "@/lib/validations";

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

  const collaborators = await listCollaboratorsForShipment(supabase, shipmentId);
  return NextResponse.json({ collaborators });
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
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
      "invite"
    );
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json().catch(() => ({}));
    const batchParsed = inviteCollaboratorsBatchSchema.safeParse(body);

    if (batchParsed.success) {
      const results = await Promise.all(
        batchParsed.data.invites.map((invite) =>
          createCollaboratorInvitation({
            request,
            shipmentId,
            userId: user.id,
            email: invite.email.trim().toLowerCase(),
            role: invite.role,
            participantType: invite.participant_type,
            shipment: access.shipment,
          })
        )
      );

      const sentCount = results.filter((result) => result.success).length;
      const failedCount = results.length - sentCount;

      return NextResponse.json(
        {
          results,
          sent_count: sentCount,
          failed_count: failedCount,
        },
        { status: sentCount > 0 ? 201 : 400 }
      );
    }

    const parsed = inviteCollaboratorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const result = await createCollaboratorInvitation({
      request,
      shipmentId,
      userId: user.id,
      email: parsed.data.email.trim().toLowerCase(),
      role: parsed.data.role,
      participantType: parsed.data.participant_type,
      shipment: access.shipment,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? "Failed to invite" }, { status: 400 });
    }

    const { email: _email, success: _success, ...payload } = result;
    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    console.error("[Collaboration] Invite failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create invitation",
      },
      { status: 500 }
    );
  }
}
