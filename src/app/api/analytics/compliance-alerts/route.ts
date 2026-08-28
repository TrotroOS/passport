import { NextResponse } from "next/server";
import { getComplianceAlerts } from "@/lib/analytics/compliance-alerts";
import { withAnalyticsAccess } from "@/lib/analytics/with-analytics-access";

export async function GET(request: Request) {
  return withAnalyticsAccess(request, async (organizationId, dateRange) => {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);
    const alerts = await getComplianceAlerts(organizationId, dateRange, limit);
    return NextResponse.json({ alerts, total: alerts.length });
  });
}
