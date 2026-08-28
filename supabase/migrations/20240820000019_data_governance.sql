-- Data governance: provenance lineage, trusted sources, trust metrics

CREATE TABLE IF NOT EXISTS public.trusted_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (
    source_type IN ('sanctions', 'tariff', 'regulatory', 'hs_reference', 'ai', 'human', 'system', 'tracking')
  ),
  authority TEXT,
  base_url TEXT,
  description TEXT,
  reliability_score NUMERIC(5,2) NOT NULL DEFAULT 80 CHECK (reliability_score >= 0 AND reliability_score <= 100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.trusted_sources (id, name, source_type, authority, base_url, description, reliability_score, metadata) VALUES
  ('opensanctions', 'OpenSanctions', 'sanctions', 'OpenSanctions.org', 'https://www.opensanctions.org/', 'Consolidated sanctions and PEP datasets', 92, '{"connector":"opensanctions"}'),
  ('ofac-sdn', 'OFAC SDN List', 'sanctions', 'US Treasury OFAC', 'https://sanctionssearch.ofac.treas.gov/', 'US Specially Designated Nationals list', 98, '{"connector":"static_watchlist"}'),
  ('un-sanctions', 'UN Security Council Sanctions', 'sanctions', 'United Nations', 'https://www.un.org/securitycouncil/sanctions/', 'UN consolidated sanctions lists', 97, '{"connector":"static_watchlist"}'),
  ('wco-hs', 'WCO Harmonized System', 'hs_reference', 'World Customs Organization', 'https://www.wcoomd.org/', 'International HS nomenclature reference', 99, '{"connector":"static_hs"}'),
  ('gra-ghana', 'Ghana Revenue Authority Customs', 'tariff', 'GRA Customs', 'https://gra.gov.gh/', 'Ghana import duty and tariff schedules', 95, '{"connector":"static_tariff"}'),
  ('unctad-trains', 'UNCTAD TRAINS', 'tariff', 'UNCTAD', 'https://trainsonline.unctad.org/', 'Trade analysis and tariff intelligence', 90, '{"connector":"static_tariff"}'),
  ('passport-regulations', 'Passport Regulation KB', 'regulatory', 'Passport Platform', NULL, 'Curated regulatory rules with source citations', 88, '{"connector":"internal"}'),
  ('openai', 'OpenAI', 'ai', 'OpenAI', 'https://openai.com/', 'Document classification and field extraction', 85, '{"connector":"openai"}'),
  ('passport-arbiter', 'Passport Arbiter', 'system', 'Passport Platform', NULL, 'Deterministic validation and normalization rules', 96, '{"connector":"internal"}'),
  ('human-analyst', 'Human Analyst', 'human', 'Organization User', NULL, 'Manual review and field confirmation', 99, '{"connector":"internal"}'),
  ('vesselfinder', 'VesselFinder', 'tracking', 'VesselFinder', 'https://www.vesselfinder.com/', 'Vessel and container tracking data', 82, '{"connector":"vesselfinder"}'),
  ('passport-watchlist', 'Passport High-Risk Watchlist', 'sanctions', 'Passport Platform', NULL, 'Curated high-risk entity patterns', 75, '{"connector":"static_watchlist"}')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.data_provenance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  field_path TEXT,
  value_snapshot JSONB,
  source_id TEXT NOT NULL REFERENCES public.trusted_sources(id),
  source_record_ref TEXT,
  confidence NUMERIC(5,4) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  transformation TEXT,
  recorded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_provenance_shipment ON public.data_provenance_events(shipment_id);
CREATE INDEX IF NOT EXISTS idx_provenance_org ON public.data_provenance_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_provenance_entity ON public.data_provenance_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_provenance_source ON public.data_provenance_events(source_id);

CREATE TABLE IF NOT EXISTS public.shipment_trust_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  trust_score NUMERIC(5,2) NOT NULL CHECK (trust_score >= 0 AND trust_score <= 100),
  data_quality_score NUMERIC(5,2) NOT NULL CHECK (data_quality_score >= 0 AND data_quality_score <= 100),
  lineage_completeness NUMERIC(5,2) NOT NULL DEFAULT 0,
  source_reliability_avg NUMERIC(5,2) NOT NULL DEFAULT 0,
  human_override_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
  metrics JSONB NOT NULL DEFAULT '{}',
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trust_snapshots_shipment ON public.shipment_trust_snapshots(shipment_id, calculated_at DESC);

ALTER TABLE public.ai_provider_logs
  ADD COLUMN IF NOT EXISTS extraction_id UUID REFERENCES public.document_extractions(id) ON DELETE SET NULL;

ALTER TABLE public.data_provenance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_trust_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trusted_sources_select"
  ON public.trusted_sources FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "provenance_select"
  ON public.data_provenance_events FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "provenance_insert"
  ON public.data_provenance_events FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "trust_snapshots_select"
  ON public.shipment_trust_snapshots FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "trust_snapshots_insert"
  ON public.shipment_trust_snapshots FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id());
