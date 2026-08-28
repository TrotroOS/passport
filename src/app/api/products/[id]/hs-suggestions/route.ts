import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getHsSuggestions,
  requireProductAccess,
} from "@/lib/hs-code/hs-code-engine";
import { HS_ADVISORY } from "@/lib/hs-code/prompts";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id: productId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await requireProductAccess(supabase, user.id, productId, "view");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const suggestions = await getHsSuggestions(productId);
  return NextResponse.json({ suggestions, advisory: HS_ADVISORY });
}
