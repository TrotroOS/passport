import { createHash, randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/errors/api-error";
import { apiErrorResponse, apiSuccessResponse } from "@/lib/errors/api-error";
import { checkRateLimit } from "@/lib/rate-limit/rate-limit";

export const API_KEY_PREFIX = "pk_live_";
export const DEFAULT_SCOPES = [
  "read:shipment",
  "write:shipment",
  "read:document",
  "write:document",
  "read:analysis",
  "write:verify",
] as const;

export type ApiScope = (typeof DEFAULT_SCOPES)[number];

export interface ApiKeyContext {
  apiKeyId: string;
  organizationId: string;
  scopes: string[];
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const random = randomBytes(24).toString("hex");
  const key = `${API_KEY_PREFIX}${random}`;
  const prefix = key.slice(0, 12);
  return { key, prefix, hash: hashApiKey(key) };
}

export function extractBearerToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7).trim();
}

export async function validateApiKey(
  request: Request,
  requiredScope?: string
): Promise<{ context: ApiKeyContext } | ApiError> {
  const token = extractBearerToken(request);
  if (!token) {
    return new ApiError(
      "UNAUTHORIZED",
      "Missing API key. Use Authorization: Bearer <api_key>",
      401
    );
  }

  if (!token.startsWith(API_KEY_PREFIX)) {
    return new ApiError("UNAUTHORIZED", "Invalid API key format", 401);
  }

  try {
    await checkRateLimit(token.slice(0, 16), "api_v1");
  } catch (err) {
    if (err instanceof ApiError) return err;
    throw err;
  }

  const admin = createAdminClient();
  const keyHash = hashApiKey(token);

  const { data: apiKey, error: dbError } = await admin
    .from("api_keys")
    .select("*")
    .eq("key_hash", keyHash)
    .eq("is_active", true)
    .single();

  if (dbError || !apiKey) {
    return new ApiError("UNAUTHORIZED", "Invalid or revoked API key", 401);
  }

  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
    return new ApiError("UNAUTHORIZED", "API key has expired", 401);
  }

  const scopes = Array.isArray(apiKey.scopes)
    ? (apiKey.scopes as string[])
    : [];

  if (requiredScope && !scopes.includes(requiredScope)) {
    return new ApiError(
      "INSUFFICIENT_SCOPE",
      `Insufficient scope. Required: ${requiredScope}`,
      403
    );
  }

  await admin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKey.id);

  return {
    context: {
      apiKeyId: apiKey.id,
      organizationId: apiKey.organization_id,
      scopes,
    },
  };
}

/** @deprecated use apiErrorResponse */
export function apiError(message: string, status = 400) {
  const code =
    status === 401
      ? "UNAUTHORIZED"
      : status === 403
        ? "FORBIDDEN"
        : status === 404
          ? "NOT_FOUND"
          : status === 429
            ? "RATE_LIMITED"
            : "BAD_REQUEST";
  return apiErrorResponse(new ApiError(code as "BAD_REQUEST", message, status));
}

export function apiSuccess<T>(data: T, status = 200) {
  return apiSuccessResponse(data, status);
}

export function handleApiAuthResult(
  result: { context: ApiKeyContext } | ApiError
): result is ApiError {
  return result instanceof ApiError;
}
