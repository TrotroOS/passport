import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireShipmentPermission } from "@/lib/shipments/shipment-access";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** Lightweight status poll for async document extraction. */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id: documentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: document, error } = await supabase
    .from("documents")
    .select(
      "id, shipment_id, doc_type, doc_type_ai, processing_status, processing_error, doc_type_confidence, created_at, updated_at"
    )
    .eq("id", documentId)
    .single();

  if (error || !document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const access = await requireShipmentPermission(
    supabase,
    user.id,
    document.shipment_id,
    "view"
  );
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { data: latestExtraction } = await supabase
    .from("document_extractions")
    .select("id, confidence, needs_human_review, is_arbiter_approved, created_at")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    document,
    latest_extraction: latestExtraction ?? null,
  });
}
