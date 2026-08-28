export type CircuitState = "closed" | "open" | "half_open";

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeoutMs?: number;
  name?: string;
}

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failures = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly name: string;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 60_000;
    this.name = options.name ?? "default";
  }

  getState(): CircuitState {
    if (
      this.state === "open" &&
      Date.now() - this.lastFailureTime >= this.resetTimeoutMs
    ) {
      this.state = "half_open";
    }
    return this.state;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const state = this.getState();

    if (state === "open") {
      throw new Error(`Circuit breaker open for ${this.name}`);
    }

    try {
      const result = await fn();
      if (state === "half_open") {
        this.reset();
      }
      return result;
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }

  recordFailure(): void {
    this.failures += 1;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = "open";
    }
  }

  reset(): void {
    this.state = "closed";
    this.failures = 0;
    this.lastFailureTime = 0;
  }
}

/** Singleton circuit breaker for AI provider calls */
let aiCircuitBreaker: CircuitBreaker | null = null;

export function getAICircuitBreaker(): CircuitBreaker {
  if (!aiCircuitBreaker) {
    aiCircuitBreaker = new CircuitBreaker({
      name: "ai_provider",
      failureThreshold: 5,
      resetTimeoutMs: 60_000,
    });
  }
  return aiCircuitBreaker;
}

export function resetAICircuitBreaker(): void {
  aiCircuitBreaker?.reset();
  aiCircuitBreaker = null;
}
