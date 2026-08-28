import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationIdForUser } from "@/lib/auth/get-organization-id";
import {
  getComplianceCalendarEvents,
  getMonthBounds,
} from "@/lib/compliance/compliance-calendar";

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

  const params = new URL(request.url).searchParams;
  const month = params.get("month");
  const year = params.get("year");

  let from: string;
  let to: string;

  if (month != null && year != null) {
    const bounds = getMonthBounds(parseInt(year, 10), parseInt(month, 10));
    from = bounds.from;
    to = bounds.to;
  } else {
    from = params.get("from") ?? new Date().toISOString();
    to =
      params.get("to") ??
      new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  }

  const result = await getComplianceCalendarEvents(organizationId, from, to);
  return NextResponse.json(result);
}
