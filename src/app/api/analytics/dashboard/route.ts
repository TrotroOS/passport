import {
  getAnalyticsSummary,
  getComplianceTrend,
  getDiscrepancyTrend,
  getShipmentStatusBreakdown,
  getTrackingSummary,
} from "@/lib/analytics/analytics-service";
import { withAnalyticsAccess } from "@/lib/analytics/with-analytics-access";

export async function GET(request: Request) {
  return withAnalyticsAccess(request, async (organizationId, dateRange) => {
    const [summary, compliance, discrepancies, status, tracking] = await Promise.all([
      getAnalyticsSummary(organizationId, dateRange),
      getComplianceTrend(organizationId, dateRange),
      getDiscrepancyTrend(organizationId, dateRange),
      getShipmentStatusBreakdown(organizationId, dateRange),
      getTrackingSummary(organizationId, dateRange),
    ]);

    return Response.json({
      summary,
      compliance: { compliance, discrepancies },
      status,
      tracking,
    });
  });
}
