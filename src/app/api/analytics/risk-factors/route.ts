import { getRiskFactorBreakdown } from "@/lib/analytics/analytics-service";
import { withAnalyticsAccess } from "@/lib/analytics/with-analytics-access";

export async function GET(request: Request) {
  return withAnalyticsAccess(request, async (organizationId, dateRange) => {
    const data = await getRiskFactorBreakdown(organizationId, dateRange);
    return Response.json(data);
  });
}
