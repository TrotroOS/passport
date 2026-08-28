import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseAnalyticsDateRange, type AnalyticsDateRange } from "./date-range";
import { requireOrgMember } from "./require-org-member";

export async function withAnalyticsAccess(
  request: Request,
  handler: (organizationId: string, dateRange: AnalyticsDateRange) => Promise<Response>
): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const member = await requireOrgMember(supabase, user.id);
  if ("error" in member) {
    return NextResponse.json({ error: member.error }, { status: member.status });
  }

  const { searchParams } = new URL(request.url);
  const dateRange = parseAnalyticsDateRange(searchParams.get("dateRange"));

  return handler(member.organizationId, dateRange);
}
