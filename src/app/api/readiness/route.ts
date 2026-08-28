import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationIdForUser } from "@/lib/auth/get-organization-id";
import { getReadinessDashboard } from "@/lib/readiness/readiness-dashboard";

export async function GET() {
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

  const dashboard = await getReadinessDashboard(organizationId);
  return NextResponse.json(dashboard);
}
