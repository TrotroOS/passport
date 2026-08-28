import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const { data: discrepancies, error } = await supabase
    .from("discrepancies")
    .select("*")
    .eq("shipment_id", shipmentId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const open = (discrepancies ?? []).filter((d) => d.status === "open");
  const resolved = (discrepancies ?? []).filter(
    (d) => d.status === "resolved" || d.status === "ignored"
  );

  return NextResponse.json({
    discrepancies: discrepancies ?? [],
    open,
    resolved,
  });
}
