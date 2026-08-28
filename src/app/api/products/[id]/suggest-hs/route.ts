import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireProductAccess,
  suggestHsCodes,
} from "@/lib/hs-code/hs-code-engine";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const { id: productId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await requireProductAccess(supabase, user.id, productId, "upload");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const result = await suggestHsCodes(productId, user.id);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to suggest HS codes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
