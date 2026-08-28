import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeAuditEvent } from "@/lib/audit";
import { confirmExtractionSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id: documentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = confirmExtractionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { extraction_id, confirmed_data, doc_type } = parsed.data;

  const { data: extraction } = await supabase
    .from("document_extractions")
    .select("*, documents(shipment_id, organization_id)")
    .eq("id", extraction_id)
    .eq("document_id", documentId)
    .single();

  if (!extraction) {
    return NextResponse.json({ error: "Extraction not found" }, { status: 404 });
  }

  const { data: updated, error: updateError } = await supabase
    .from("document_extractions")
    .update({
      extracted_data: confirmed_data,
      extraction_type: doc_type ?? extraction.extraction_type,
      needs_human_review: false,
      is_arbiter_approved: true,
    })
    .eq("id", extraction_id)
    .select()
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: updateError?.message ?? "Failed to update extraction" },
      { status: 500 }
    );
  }

  await supabase
    .from("documents")
    .update({
      processing_status: "processed",
      doc_type: doc_type ?? extraction.extraction_type,
      doc_type_ai: doc_type ?? extraction.extraction_type,
      processing_error: null,
    })
    .eq("id", documentId);

  const doc = extraction.documents as {
    shipment_id: string;
    organization_id: string;
  };

  const { writeHumanOverrideProvenance } = await import("@/lib/governance/provenance");
  writeHumanOverrideProvenance({
    organizationId: doc.organization_id,
    shipmentId: doc.shipment_id,
    extractionId: extraction_id,
    documentId,
    confirmedData: confirmed_data as Record<string, unknown>,
    previousData: (extraction.extracted_data ?? {}) as Record<string, unknown>,
    userId: user.id,
  }).catch((err) => console.warn("[Provenance]", err));

  await writeAuditEvent(supabase, {
    organizationId: doc.organization_id,
    userId: user.id,
    action: "document.extraction.confirmed",
    entityType: "document_extraction",
    entityId: extraction_id,
    shipmentId: doc.shipment_id,
    metadata: {
      document_id: documentId,
      doc_type: doc_type ?? extraction.extraction_type,
      fields_overridden: Object.keys(confirmed_data).length,
    },
  });

  const { runVerificationAndScore } = await import(
    "@/lib/verification/verification-engine"
  );
  runVerificationAndScore(doc.shipment_id, user.id).catch((err) => {
    console.error("[Verification] Auto-run failed:", err);
  });

  return NextResponse.json({ extraction: updated });
}
