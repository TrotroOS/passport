import { getShipmentStatusBreakdown } from "@/lib/analytics/analytics-service";
import { withAnalyticsAccess } from "@/lib/analytics/with-analytics-access";

export async function GET(request: Request) {
  return withAnalyticsAccess(request, async (organizationId, dateRange) => {
    const data = await getShipmentStatusBreakdown(organizationId, dateRange);
    return Response.json(data);
  });
}
