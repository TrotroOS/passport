import type { TrackingProvider } from "../types";
import { isProduction } from "@/lib/env";
import { MockTrackingProvider } from "./mock-provider";
import { Terminal49TrackingProvider } from "./terminal49-provider";

export function createTrackingProvider(): TrackingProvider {
  const provider = (process.env.TRACKING_PROVIDER ?? "mock").toLowerCase();
  const apiKey = process.env.TRACKING_API_KEY ?? "";
  const apiUrl = process.env.TRACKING_API_URL;

  if (provider === "vesselfinder") {
    throw new Error(
      "TRACKING_PROVIDER=vesselfinder is not supported. Use terminal49 for live container tracking (better multi-carrier coverage) or mock for demos."
    );
  }

  if (provider === "mock") {
    if (isProduction()) {
      console.warn(
        "[Passport] TRACKING_PROVIDER=mock in production — set TRACKING_PROVIDER=terminal49 and TRACKING_API_KEY for live tracking"
      );
    }
    return new MockTrackingProvider();
  }

  if (provider === "terminal49") {
    if (!apiKey.trim()) {
      throw new Error(
        "TRACKING_API_KEY is required when TRACKING_PROVIDER=terminal49"
      );
    }
    return new Terminal49TrackingProvider(apiKey, apiUrl);
  }

  throw new Error(`Unknown TRACKING_PROVIDER: ${provider}`);
}

export { MockTrackingProvider, Terminal49TrackingProvider };
