import { NextResponse } from "next/server";
import { getTopPartiesForNetwork } from "@/lib/analytics/analytics-service";
import { parseAnalyticsDateRange } from "@/lib/analytics/date-range";
import { withAnalyticsAccess } from "@/lib/analytics/with-analytics-access";
import { getEntityGraph } from "@/lib/graph/entity-graph";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");

  if (entityType && entityId) {
    return withAnalyticsAccess(request, async (organizationId) => {
      const graph = await getEntityGraph(entityType, entityId, organizationId);
      if (!graph) {
        return NextResponse.json({ error: "Entity not found" }, { status: 404 });
      }
      return Response.json(graph);
    });
  }

  return withAnalyticsAccess(request, async (organizationId, dateRange) => {
    void parseAnalyticsDateRange(dateRange);
    const parties = await getTopPartiesForNetwork(organizationId);
    return Response.json(parties);
  });
}
