-- Corridor Intelligence Moat: compounding org + platform trade compliance memory

CREATE TABLE public.corridor_intelligence_baselines (
  jurisdiction_code TEXT PRIMARY KEY CHECK (jurisdiction_code IN ('GH', 'NG', 'KE')),
  label TEXT NOT NULL,
  benchmark_passport_score NUMERIC(5,2) NOT NULL DEFAULT 78,
  median_days_to_ready NUMERIC(6,2),
  common_blockers JSONB NOT NULL DEFAULT '[]'::jsonb,
  playbook_tips JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.organization_corridor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  jurisdiction_code TEXT NOT NULL CHECK (jurisdiction_code IN ('GH', 'NG', 'KE')),
  shipments_total INTEGER NOT NULL DEFAULT 0,
  cleared_assistive_count INTEGER NOT NULL DEFAULT 0,
  blocked_count INTEGER NOT NULL DEFAULT 0,
  avg_passport_score NUMERIC(5,2),
  top_discrepancy_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_cleared_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, jurisdiction_code)
);

CREATE INDEX idx_org_corridor_profiles_org
  ON public.organization_corridor_profiles (organization_id);

CREATE TABLE public.party_corridor_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  party_name_normalized TEXT NOT NULL,
  party_role TEXT NOT NULL,
  shipment_count INTEGER NOT NULL DEFAULT 0,
  blocked_count INTEGER NOT NULL DEFAULT 0,
  cleared_count INTEGER NOT NULL DEFAULT 0,
  avg_passport_score NUMERIC(5,2),
  last_shipment_id UUID REFERENCES public.shipments(id) ON DELETE SET NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, party_name_normalized, party_role)
);

CREATE INDEX idx_party_corridor_memory_org
  ON public.party_corridor_memory (organization_id, last_seen_at DESC);

ALTER TABLE public.corridor_intelligence_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_corridor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_corridor_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY corridor_baselines_read ON public.corridor_intelligence_baselines
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY org_corridor_profiles_select ON public.organization_corridor_profiles
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY org_corridor_profiles_service ON public.organization_corridor_profiles
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY party_memory_select ON public.party_corridor_memory
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY party_memory_service ON public.party_corridor_memory
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

INSERT INTO public.corridor_intelligence_baselines
  (jurisdiction_code, label, benchmark_passport_score, median_days_to_ready, common_blockers, playbook_tips)
VALUES
  (
    'GH',
    'Ghana',
    80,
    4.5,
    '["Invoice vs packing list quantity mismatch","Missing FDA import permit for food","HS code not verified","Bill of lading container mismatch"]'::jsonb,
    '["Confirm GRA Customs invoice values match packing list before filing","Food imports: obtain FDA permit early","Use Passport Score ≥80 before broker handoff"]'::jsonb
  ),
  (
    'NG',
    'Nigeria',
    77,
    6,
    '["NAFDAC registration missing for regulated goods","Commercial invoice currency inconsistency","Missing bill of lading","Form M / PAAR documentation gaps"]'::jsonb,
    '["Validate NAFDAC requirements for product category first","Align invoice and declaration currencies","Broker review before SON/NAFDAC submissions"]'::jsonb
  ),
  (
    'KE',
    'Kenya',
    79,
    5,
    '["KEBS/PVoC certificate missing","HS classification conflicts","Origin certificate gaps","Import declaration value mismatch"]'::jsonb,
    '["Check KEBS requirements for consumer goods","Resolve HS codes before IDF filing","Keep origin certificates with invoice set"]'::jsonb
  )
ON CONFLICT (jurisdiction_code) DO NOTHING;

COMMENT ON TABLE public.organization_corridor_profiles IS
  'Per-tenant corridor learning — compounds with every shipment cleared through Passport.';
COMMENT ON TABLE public.party_corridor_memory IS
  'Org-scoped counterparty memory for repeat supplier/broker risk signals.';
COMMENT ON TABLE public.corridor_intelligence_baselines IS
  'Platform corridor playbooks and benchmarks — Passport proprietary intelligence.';
