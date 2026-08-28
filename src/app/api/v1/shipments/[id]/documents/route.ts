import { createAdminClient } from "@/lib/supabase/admin";
import { apiSuccess } from "@/lib/api/api-key-auth";
import { requireApiKey } from "@/lib/api/require-api-key";
import { getShipmentForOrg } from "@/lib/api/shipment-service";
import { uploadShipmentDocument } from "@/lib/documents/upload-document";
import { ApiError, apiErrorResponse } from "@/lib/errors/api-error";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from "@/lib/utils";
import { uploadDocumentSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireApiKey(request, "read:document");
  if (auth instanceof Response) return auth;

  const { id: shipmentId } = await params;
  const shipment = await getShipmentForOrg(shipmentId, auth.organizationId);

  if (!shipment) {
    return apiErrorResponse(new ApiError("NOT_FOUND", "Shipment not found", 404));
  }

  const admin = createAdminClient();
  const { data: documents } = await admin
    .from("documents")
    .select("*")
    .eq("shipment_id", shipmentId)
    .order("created_at", { ascending: false });

  return apiSuccess({ documents: documents ?? [] });
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireApiKey(request, "write:document");
  if (auth instanceof Response) return auth;

  const { id: shipmentId } = await params;
  const shipment = await getShipmentForOrg(shipmentId, auth.organizationId);

  if (!shipment) {
    return apiErrorResponse(new ApiError("NOT_FOUND", "Shipment not found", 404));
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const docType = formData.get("doc_type");

  const parsed = uploadDocumentSchema.safeParse({ doc_type: docType });
  if (!parsed.success) {
    return apiErrorResponse(
      new ApiError(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message ?? "Invalid document type",
        400
      )
    );
  }

  if (!file || !(file instanceof File)) {
    return apiErrorResponse(new ApiError("VALIDATION_ERROR", "File is required", 400));
  }

  if (file.size > MAX_FILE_SIZE) {
    return apiErrorResponse(
      new ApiError("VALIDATION_ERROR", "File must be 20MB or less", 400)
    );
  }

  if (
    !ALLOWED_MIME_TYPES.includes(
      file.type as (typeof ALLOWED_MIME_TYPES)[number]
    )
  ) {
    return apiErrorResponse(new ApiError("VALIDATION_ERROR", "File type not allowed", 400));
  }

  const result = await uploadShipmentDocument({
    shipmentId,
    organizationId: auth.organizationId,
    file,
    fileName: file.name,
    mimeType: file.type,
    docType: parsed.data.doc_type,
  });

  if ("error" in result) {
    return apiErrorResponse(new ApiError("INTERNAL_ERROR", result.error, 500));
  }

  return apiSuccess({ document: result.document }, 201);
}
