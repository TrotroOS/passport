-- Party sanctions screening + user notification preferences

CREATE TABLE IF NOT EXISTS public.party_screenings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  screened_name TEXT NOT NULL,
  match_status TEXT NOT NULL CHECK (match_status IN ('clear', 'potential_match', 'confirmed_match')),
  match_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  list_source TEXT NOT NULL DEFAULT 'passport_watchlist',
  match_details JSONB NOT NULL DEFAULT '{}',
  screened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (party_id, list_source)
);

CREATE INDEX IF NOT EXISTS idx_party_screenings_shipment ON public.party_screenings(shipment_id);
CREATE INDEX IF NOT EXISTS idx_party_screenings_org ON public.party_screenings(organization_id);
CREATE INDEX IF NOT EXISTS idx_party_screenings_status ON public.party_screenings(match_status);

ALTER TABLE public.party_screenings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "party_screenings_select"
  ON public.party_screenings FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "party_screenings_insert"
  ON public.party_screenings FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "party_screenings_update"
  ON public.party_screenings FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id())
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "party_screenings_delete"
  ON public.party_screenings FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id());

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{
    "email_alerts": true,
    "tracking_updates": true,
    "compliance_alerts": true,
    "weekly_digest": false
  }'::jsonb;
