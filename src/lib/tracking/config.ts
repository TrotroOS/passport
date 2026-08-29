export type TrackingMode = "demo" | "live" | "unconfigured";

export interface TrackingConfig {
  mode: TrackingMode;
  provider: string;
  isLive: boolean;
  cronEnabled: boolean;
  webhookEnabled: boolean;
  providerLabel: string;
}

/** Server-safe tracking configuration (no secrets). */
export function getTrackingConfig(): TrackingConfig {
  const provider = (process.env.TRACKING_PROVIDER ?? "mock").toLowerCase();
  const hasApiKey = Boolean(process.env.TRACKING_API_KEY?.trim());

  let mode: TrackingMode = "demo";
  if (provider === "mock") {
    mode = "demo";
  } else if (provider === "terminal49" && hasApiKey) {
    mode = "live";
  } else if (provider === "terminal49") {
    mode = "unconfigured";
  } else {
    mode = "unconfigured";
  }

  const providerLabel =
    mode === "live"
      ? "Terminal49"
      : mode === "demo"
        ? "Demo"
        : provider === "terminal49"
          ? "Terminal49 (missing API key)"
          : provider;

  return {
    mode,
    provider,
    isLive: mode === "live",
    cronEnabled: mode === "live" && Boolean(process.env.CRON_SECRET?.trim()),
    webhookEnabled: Boolean(process.env.TRACKING_WEBHOOK_SECRET?.trim()),
    providerLabel,
  };
}

export function shouldRunScheduledTrackingRefresh(): boolean {
  return getTrackingConfig().isLive;
}
