export interface SentryCallOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export interface SentryResult<T> {
  data?: T;
  error?: Error;
  attempts: number;
  latencyMs: number;
}

const DEFAULT_RETRIES = 3;
const DEFAULT_DELAY_MS = 1000;

function isRetryable(error: Error): boolean {
  const msg = error.message.toLowerCase();
  return (
    msg.includes("rate limit") ||
    msg.includes("429") ||
    msg.includes("timeout") ||
    msg.includes("econnreset") ||
    msg.includes("503") ||
    msg.includes("502")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sentryCall<T>(
  fn: () => Promise<T>,
  options: SentryCallOptions = {}
): Promise<SentryResult<T>> {
  const maxRetries = options.maxRetries ?? DEFAULT_RETRIES;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_DELAY_MS;
  const start = Date.now();
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const data = await fn();
      return { data, attempts: attempt, latencyMs: Date.now() - start };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < maxRetries && isRetryable(lastError)) {
        options.onRetry?.(attempt, lastError);
        await sleep(retryDelayMs * Math.pow(2, attempt - 1));
        continue;
      }

      break;
    }
  }

  return {
    error: lastError,
    attempts: maxRetries,
    latencyMs: Date.now() - start,
  };
}

export interface SignedUrlResult {
  signedUrl: string;
}

export async function sentryCreateSignedUrl(
  createFn: () => Promise<{ data: { signedUrl: string } | null; error: Error | null }>
): Promise<SentryResult<SignedUrlResult>> {
  return sentryCall(async () => {
    const { data, error } = await createFn();
    if (error) throw error;
    if (!data?.signedUrl) throw new Error("No signed URL returned from storage");
    return { signedUrl: data.signedUrl };
  });
}

export interface StorageDownloadResult {
  buffer: Buffer;
  mimeType: string;
}

export async function sentryDownloadFromStorage(
  downloadFn: () => Promise<{ data: Blob | null; error: Error | null }>,
  mimeType: string
): Promise<SentryResult<StorageDownloadResult>> {
  return sentryCall(async () => {
    const { data, error } = await downloadFn();
    if (error) throw error;
    if (!data) throw new Error("No data returned from storage");

    const arrayBuffer = await data.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType,
    };
  });
}

export interface AILogContext {
  organizationId: string;
  userId?: string;
  documentId?: string;
  productId?: string;
  provider: string;
  model: string;
  promptVersion: string;
}

export interface AILogResult {
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
  latencyMs: number;
  status: "success" | "error" | "rate_limited";
  errorMessage?: string;
}

export async function sentryAICall<T extends { usage?: { inputTokens?: number; outputTokens?: number; cost?: number; latencyMs?: number; model?: string } }>(
  fn: () => Promise<T>,
  logFn: (logResult: AILogResult, data?: T) => Promise<void>,
  context: AILogContext
): Promise<SentryResult<T>> {
  const result = await sentryCall(fn, {
    onRetry: (attempt, error) => {
      console.warn(
        `[Sentry] AI call retry ${attempt} for ${context.productId ? `product ${context.productId}` : `doc ${context.documentId}`}:`,
        error.message
      );
    },
  });

  const isRateLimited =
    result.error?.message.toLowerCase().includes("rate limit") ?? false;

  await logFn(
    {
      inputTokens: result.data?.usage?.inputTokens,
      outputTokens: result.data?.usage?.outputTokens,
      cost: result.data?.usage?.cost,
      latencyMs: result.data?.usage?.latencyMs ?? result.latencyMs,
      status: result.error
        ? isRateLimited
          ? "rate_limited"
          : "error"
        : "success",
      errorMessage: result.error?.message,
    },
    result.data
  );

  return result;
}
