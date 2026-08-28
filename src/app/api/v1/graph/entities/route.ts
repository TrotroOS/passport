import { getEntityGraph } from "@/lib/graph/entity-graph";
import { apiSuccess } from "@/lib/api/api-key-auth";
import { requireApiKey } from "@/lib/api/require-api-key";
import { ApiError, apiErrorResponse } from "@/lib/errors/api-error";

export async function GET(request: Request) {
  const auth = await requireApiKey(request, "read:analysis");
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("type");
  const entityId = searchParams.get("id");

  if (!entityType || !entityId) {
    return apiErrorResponse(
      new ApiError("BAD_REQUEST", "Query params 'type' and 'id' are required", 400)
    );
  }

  const graph = await getEntityGraph(
    entityType,
    entityId,
    auth.organizationId
  );

  if (!graph) {
    return apiErrorResponse(new ApiError("NOT_FOUND", "Entity not found", 404));
  }

  return apiSuccess({ graph });
}
