import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
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
    .select("*")
    .eq("id", documentId)
    .single();

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const [{ data: extractions }, { data: arbiterEvents }] = await Promise.all([
    supabase
      .from("document_extractions")
      .select("*")
      .eq("document_id", documentId)
      .order("created_at", { ascending: false }),
    supabase
      .from("arbiter_events")
      .select("*")
      .eq("document_id", documentId)
      .order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({
    document,
    extractions: extractions ?? [],
    arbiter_events: arbiterEvents ?? [],
  });
}
