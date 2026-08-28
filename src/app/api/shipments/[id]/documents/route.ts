import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditEvent } from "@/lib/audit";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from "@/lib/utils";
import { uploadDocumentSchema } from "@/lib/validations";
import { scheduleDocumentProcessing } from "@/lib/pipeline/queue-document-processing";
import { requireShipmentPermission } from "@/lib/shipments/shipment-access";
import { uploadShipmentDocument } from "@/lib/documents/upload-document";
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

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File must be 20MB or less" }, { status: 400 });
  }

  if (
    !ALLOWED_MIME_TYPES.includes(
      file.type as (typeof ALLOWED_MIME_TYPES)[number]
    )
  ) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
  }

  const shipment = access.shipment;
  const isCollaborator = access.level === "collaborator";

  if (isCollaborator) {
    const result = await uploadShipmentDocument({
      shipmentId,
      organizationId: shipment.organization_id,
      userId: user.id,
      file,
      fileName: file.name,
      mimeType: file.type,
      docType: parsed.data.doc_type,
      uploadedByCollaborator: true,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

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
        file_name: file.name,
      },
    });

    return NextResponse.json({ document: result.document }, { status: 201 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const documentId = randomUUID();
  const filePath = `${shipment.organization_id}/${shipmentId}/${documentId}`;

  const { error: uploadError } = await supabase.storage
    .from("passport-documents")
    .upload(filePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: document, error: docError } = await supabase
    .from("documents")
    .insert({
      id: documentId,
      shipment_id: shipmentId,
      organization_id: shipment.organization_id,
      doc_type: parsed.data.doc_type,
      file_path: filePath,
      file_name: file.name,
      mime_type: file.type,
      uploaded_by: user.id,
      uploaded_by_collaborator: false,
    })
    .select()
    .single();

  if (docError || !document) {
    await supabase.storage.from("passport-documents").remove([filePath]);
    return NextResponse.json(
      { error: docError?.message ?? "Failed to save document record" },
      { status: 500 }
    );
  }

  await writeAuditEvent(supabase, {
    organizationId: shipment.organization_id,
    userId: user.id,
    action: "document.uploaded",
    entityType: "document",
    entityId: document.id,
    shipmentId,
    metadata: {
      doc_type: document.doc_type,
      file_name: file.name,
      mime_type: file.type,
    },
  });

  scheduleDocumentProcessing({ documentId: document.id, userId: user.id });

  return NextResponse.json(
    {
      document,
      processing_queued: true,
    },
    { status: 201 }
  );
}
