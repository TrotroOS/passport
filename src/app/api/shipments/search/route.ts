import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationIdForUser } from "@/lib/auth/get-organization-id";
import { searchShipments } from "@/lib/shipments/search-shipments";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = await getOrganizationIdForUser(supabase, user.id);
  if (!organizationId) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const q = new URL(request.url).searchParams.get("q") ?? "";
  const results = await searchShipments(organizationId, q);
  return NextResponse.json({ results });
}
