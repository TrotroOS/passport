import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireProductAccess,
  selectHsCode,
} from "@/lib/hs-code/hs-code-engine";
import { selectHsCodeSchema } from "@/lib/hs-code/schemas";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
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

  const body = await request.json().catch(() => ({}));
  const parsed = selectHsCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const result = await selectHsCode(
      productId,
      parsed.data.suggestionId,
      user.id,
      parsed.data.markVerified
    );
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to select HS code";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
