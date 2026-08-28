import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const categoryCode = searchParams.get("category");
  const jurisdictionCode = searchParams.get("jurisdiction") ?? "GH";

  let query = supabase
    .from("regulations")
    .select("*, jurisdictions(code, name), product_categories(code, name)")
    .eq("is_active", true);

  if (categoryCode) {
    const { data: category } = await supabase
      .from("product_categories")
      .select("id")
      .eq("code", categoryCode)
      .single();

    if (category) {
      query = query.eq("product_category_id", category.id);
    }
  }

  if (jurisdictionCode) {
    const { data: jurisdiction } = await supabase
      .from("jurisdictions")
      .select("id")
      .eq("code", jurisdictionCode)
      .single();

    if (jurisdiction) {
      query = query.eq("jurisdiction_id", jurisdiction.id);
    }
  }

  const { data: regulations, error } = await query.order("title");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ regulations: regulations ?? [] });
}
