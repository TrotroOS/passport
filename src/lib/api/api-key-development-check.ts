import {
  API_KEY_PREFIX,
  extractBearerToken,
  validateApiKey,
  type ApiKeyContext,
} from "@/lib/api/api-key-auth";
import { listShipmentsForOrg } from "@/lib/api/shipment-service";
import { ApiError } from "@/lib/errors/api-error";

export interface DevelopmentCheckItem {
  id: string;
  label: string;
  passed: boolean;
  message: string;
}

export interface ApiKeyDevelopmentCheckResult {
  checks: DevelopmentCheckItem[];
  allPassed: boolean;
  context?: ApiKeyContext;
  liveStatus?: number;
  shipmentCount?: number;
}

function check(
  id: string,
  label: string,
  passed: boolean,
  message: string
): DevelopmentCheckItem {
  return { id, label, passed, message };
}

export function validateApiKeyFormat(key: string): DevelopmentCheckItem {
  const trimmed = key.trim();
  if (!trimmed) {
    return check("format", "Key format", false, "API key is required");
  }
  if (!trimmed.startsWith(API_KEY_PREFIX)) {
    return check(
      "format",
      "Key format",
      false,
      `Key must start with ${API_KEY_PREFIX}`
    );
  }
  if (trimmed.length < 20) {
    return check("format", "Key format", false, "Key appears truncated");
  }
  return check("format", "Key format", true, "Key format is valid");
}

export async function runApiKeyDevelopmentCheck(
  rawKey: string,
  options?: { baseUrl?: string; runLiveRequest?: boolean }
): Promise<ApiKeyDevelopmentCheckResult> {
  const key = rawKey.trim();
  const checks: DevelopmentCheckItem[] = [];

  const formatResult = validateApiKeyFormat(key);
  checks.push(formatResult);
  if (!formatResult.passed) {
    return { checks, allPassed: false };
  }

  const authRequest = new Request("http://passport.local/api/v1/shipments", {
    headers: { Authorization: `Bearer ${key}` },
  });

  const token = extractBearerToken(authRequest);
  checks.push(
    check(
      "bearer",
      "Authorization header",
      token === key,
      token ? "Bearer token parsed successfully" : "Could not parse Bearer token"
    )
  );

  const auth = await validateApiKey(authRequest, "read:shipment");
  if (auth instanceof ApiError) {
    checks.push(
      check("auth", "Key authentication", false, auth.message)
    );
    return { checks, allPassed: false };
  }

  checks.push(
    check("auth", "Key authentication", true, "Key is active and recognized")
  );

  const hasReadScope = auth.context.scopes.includes("read:shipment");
  checks.push(
    check(
      "scope",
      "Required scope",
      hasReadScope,
      hasReadScope
        ? "Includes read:shipment"
        : "Missing read:shipment scope for list endpoint"
    )
  );

  let liveStatus: number | undefined;
  let shipmentCount: number | undefined;

  if (options?.runLiveRequest !== false) {
    try {
      const shipments = await listShipmentsForOrg(auth.context.organizationId, {
        limit: 5,
      });
      shipmentCount = shipments.length;
      liveStatus = 200;
      checks.push(
        check(
          "live",
          "Shipment list access",
          true,
          `Key can list ${shipmentCount} shipment${shipmentCount === 1 ? "" : "s"} for this organization`
        )
      );
    } catch (err) {
      checks.push(
        check(
          "live",
          "Shipment list access",
          false,
          err instanceof Error ? err.message : "Failed to query shipments"
        )
      );
    }

    // Optional HTTP probe for external deployments (skip self-fetch in dev — it deadlocks).
    const base = options?.baseUrl?.replace(/\/$/, "");
    if (base && !isLikelySameOriginSelfFetch(base)) {
      try {
        const response = await fetch(`${base}/api/v1/shipments?limit=1`, {
          headers: { Authorization: `Bearer ${key}` },
          cache: "no-store",
        });
        liveStatus = response.status;

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: { message?: string };
          } | null;
          checks.push(
            check(
              "http",
              "HTTP API request",
              false,
              body?.error?.message ?? `HTTP ${response.status}`
            )
          );
        } else {
          const body = (await response.json()) as {
            data?: { shipments?: unknown[] };
          };
          const count = Array.isArray(body.data?.shipments)
            ? body.data.shipments.length
            : undefined;
          if (count != null) shipmentCount = count;
          checks.push(
            check(
              "http",
              "HTTP API request",
              true,
              `GET /api/v1/shipments responded with HTTP ${response.status}`
            )
          );
        }
      } catch (err) {
        checks.push(
          check(
            "http",
            "HTTP API request",
            false,
            err instanceof Error ? err.message : "Network request failed"
          )
        );
      }
    }
  }

  const allPassed = checks.every((item) => item.passed);
  return {
    checks,
    allPassed,
    context: auth.context,
    liveStatus,
    shipmentCount,
  };
}

/** Avoid self-HTTP in dev — Next.js can deadlock waiting on its own server. */
export function isLikelySameOriginSelfFetch(baseUrl: string): boolean {
  if (process.env.NODE_ENV === "production") return false;
  try {
    const { hostname } = new URL(baseUrl);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]"
    );
  } catch {
    return true;
  }
}
