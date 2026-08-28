import { validateApiKey, type ApiKeyContext } from "./api-key-auth";
import { ApiError, apiErrorResponse } from "@/lib/errors/api-error";

export async function requireApiKey(
  request: Request,
  scope?: string
): Promise<ApiKeyContext | Response> {
  const result = await validateApiKey(request, scope);
  if (result instanceof ApiError) {
    return apiErrorResponse(result);
  }
  return result.context;
}
