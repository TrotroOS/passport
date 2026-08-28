import {
  getComplianceTrend,
  getDiscrepancyTrend,
} from "@/lib/analytics/analytics-service";
import { withAnalyticsAccess } from "@/lib/analytics/with-analytics-access";

export async function GET(request: Request) {
  return withAnalyticsAccess(request, async (organizationId, dateRange) => {
    const [compliance, discrepancies] = await Promise.all([
      getComplianceTrend(organizationId, dateRange),
      getDiscrepancyTrend(organizationId, dateRange),
    ]);
    return Response.json({ compliance, discrepancies });
  });
}
