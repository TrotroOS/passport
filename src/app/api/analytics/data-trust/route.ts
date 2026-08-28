import { NextResponse } from "next/server";
import { withAnalyticsAccess } from "@/lib/analytics/with-analytics-access";
import { calculateOrgDataQuality } from "@/lib/governance/data-quality";
import { calculateOrgGovernanceSummary } from "@/lib/governance/trust-score";

export async function GET(request: Request) {
  return withAnalyticsAccess(request, async (organizationId) => {
    const [governance, quality] = await Promise.all([
      calculateOrgGovernanceSummary(organizationId),
      calculateOrgDataQuality(organizationId),
    ]);

    return NextResponse.json({
      governance,
      quality,
      trust: {
        avgTrustScore: governance.avgTrustScore,
        provenanceEventCount: governance.provenanceEventCount,
        connectedSourceCatalog: governance.connectedSourceCatalog,
        sourcesByType: governance.sourcesByType,
      },
    });
  });
}
