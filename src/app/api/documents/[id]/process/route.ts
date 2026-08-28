import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { queueDocumentProcessing } from "@/lib/pipeline/queue-document-processing";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** Queue async document extraction. Poll GET /api/documents/:id for status. */
export async function POST(_request: Request, { params }: RouteParams) {
  const { id: documentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: document } = await supabase
    .from("documents")
    .select("id, processing_status")
    .eq("id", documentId)
    .single();

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const queueResult = await queueDocumentProcessing({
    documentId,
    userId: user.id,
  });

  if (!queueResult.queued) {
    if (queueResult.reason === "already_processing") {
      return NextResponse.json(
        { error: "Document is already being processed" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      queued: true,
      document_id: documentId,
      processing_status: "processing",
      message:
        "Document extraction queued. Poll GET /api/documents/:id or subscribe to document.processed webhooks.",
    },
    { status: 202 }
  );
}
