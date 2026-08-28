export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE"
  | "RESOURCE_NOT_FOUND"
  | "VALIDATION_ERROR"
  | "INSUFFICIENT_SCOPE";

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;
  readonly exposeToClient: boolean;

  constructor(
    code: ApiErrorCode,
    message: string,
    status: number,
    details?: Record<string, unknown>,
    exposeToClient = true
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
    this.exposeToClient = exposeToClient;
  }

  toJSON(): ApiErrorBody {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && Object.keys(this.details).length > 0
          ? { details: this.details }
          : {}),
      },
    };
  }
}

export function apiErrorResponse(
  error: ApiError | Error,
  requestId?: string
): Response {
  if (error instanceof ApiError && error.exposeToClient) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (requestId) headers["X-Request-Id"] = requestId;
    if (error.code === "RATE_LIMITED" && error.details?.retryAfter) {
      headers["Retry-After"] = String(error.details.retryAfter);
    }
    return Response.json(error.toJSON(), { status: error.status, headers });
  }

  return Response.json(
    {
      error: {
        code: "INTERNAL_ERROR" as ApiErrorCode,
        message: "An unexpected error occurred",
      },
    },
    {
      status: 500,
      headers: requestId ? { "X-Request-Id": requestId } : undefined,
    }
  );
}

export function apiSuccessResponse<T>(
  data: T,
  status = 200,
  requestId?: string
): Response {
  return Response.json(
    { data },
    {
      status,
      headers: requestId ? { "X-Request-Id": requestId } : undefined,
    }
  );
}
