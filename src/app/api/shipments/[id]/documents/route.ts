import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditEvent } from "@/lib/audit";
import { uploadDocumentSchema } from "@/lib/validations";
import { requireShipmentPermission } from "@/lib/shipments/shipment-access";
import { uploadShipmentDocument } from "@/lib/documents/upload-document";
import { validateUploadFile } from "@/lib/security/validate-upload";
import { ApiError } from "@/lib/errors/api-error";
import { checkRateLimit } from "@/lib/rate-limit/rate-limit";

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

  const { data: documents, error } = await supabase
    .from("documents")
    .select("*")
    .eq("shipment_id", shipmentId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ documents: documents ?? [] });
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
    "upload"
  );
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    await checkRateLimit(`upload:${user.id}`, "document_upload");
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const docType = formData.get("doc_type");

  const parsed = uploadDocumentSchema.safeParse({ doc_type: docType });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid document type" },
      { status: 400 }
    );
  }

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  const fileValidation = await validateUploadFile(file);
  if (!fileValidation.ok) {
    return NextResponse.json({ error: fileValidation.error }, { status: 400 });
  }

  const shipment = access.shipment;
  const isCollaborator = access.level === "collaborator";

  const result = await uploadShipmentDocument({
    shipmentId,
    organizationId: shipment.organization_id,
    userId: user.id,
    file,
    fileName: file.name,
    mimeType: file.type,
    docType: parsed.data.doc_type,
    uploadedByCollaborator: isCollaborator,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  if (isCollaborator) {
    const admin = createAdminClient();
    await writeAuditEvent(admin, {
      organizationId: shipment.organization_id,
      userId: user.id,
      action: "collaborator.document_uploaded",
      entityType: "document",
      entityId: String(result.document.id),
      shipmentId,
      metadata: {
        collaborator_organization_id: access.userOrganizationId,
        collaborator_role: access.role,
        file_name: fileValidation.fileName,
      },
    });
  }

  return NextResponse.json(
    {
      document: result.document,
      processing_queued: true,
    },
    { status: 201 }
  );
}
