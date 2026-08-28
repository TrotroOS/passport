import type { TrackingProvider } from "../types";
import { isProduction } from "@/lib/env";
import { MockTrackingProvider } from "./mock-provider";
import { VesselFinderTrackingProvider } from "./vesselfinder-provider";

export function createTrackingProvider(): TrackingProvider {
  const provider = (process.env.TRACKING_PROVIDER ?? "mock").toLowerCase();
  const apiKey = process.env.TRACKING_API_KEY ?? "";
  const apiUrl = process.env.TRACKING_API_URL;

  if (provider === "mock" && isProduction()) {
    console.warn(
      "[Passport] TRACKING_PROVIDER=mock in production — configure a live provider for real tracking"
    );
  }

  switch (provider) {
    case "vesselfinder":
      return new VesselFinderTrackingProvider(apiKey, apiUrl);
    case "mock":
    default:
      return new MockTrackingProvider();
  }
}

export { MockTrackingProvider, VesselFinderTrackingProvider };
