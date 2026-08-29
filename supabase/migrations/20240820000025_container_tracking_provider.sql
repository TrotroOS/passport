-- Provider sync metadata for live container tracking (Terminal49, etc.)

ALTER TABLE public.container_details
  ADD COLUMN IF NOT EXISTS carrier_scac TEXT,
  ADD COLUMN IF NOT EXISTS tracking_provider TEXT,
  ADD COLUMN IF NOT EXISTS provider_container_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_tracking_request_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_last_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_container_details_provider_sync
  ON public.container_details (provider_last_synced_at)
  WHERE provider_last_synced_at IS NOT NULL;

INSERT INTO public.tracking_providers (name, api_url, is_active)
VALUES ('terminal49', 'https://api.terminal49.com/v2', true)
ON CONFLICT (name) DO UPDATE SET
  api_url = EXCLUDED.api_url,
  is_active = true;
