-- Cross-document verification and Passport Score

CREATE TABLE public.verification_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  check_id TEXT NOT NULL,
  check_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'warning', 'needs_review')),
  details JSONB NOT NULL DEFAULT '{}',
  document_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_verification_checks_shipment_id ON public.verification_checks(shipment_id);
CREATE UNIQUE INDEX idx_verification_checks_shipment_check_id ON public.verification_checks(shipment_id, check_id);

CREATE TRIGGER verification_checks_updated_at
  BEFORE UPDATE ON public.verification_checks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.discrepancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  verification_check_id UUID REFERENCES public.verification_checks(id) ON DELETE CASCADE,
  discrepancy_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  description TEXT NOT NULL,
  values JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'ignored')),
  resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_discrepancies_shipment_id ON public.discrepancies(shipment_id);
CREATE INDEX idx_discrepancies_status ON public.discrepancies(status);

CREATE TRIGGER discrepancies_updated_at
  BEFORE UPDATE ON public.discrepancies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.passport_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  overall_score NUMERIC NOT NULL,
  documentation_score NUMERIC,
  consistency_score NUMERIC,
  counterparty_score NUMERIC,
  regulatory_score NUMERIC,
  score_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_passport_scores_shipment_id ON public.passport_scores(shipment_id);
CREATE INDEX idx_passport_scores_created_at ON public.passport_scores(shipment_id, created_at DESC);

CREATE TRIGGER passport_scores_updated_at
  BEFORE UPDATE ON public.passport_scores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.verification_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discrepancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passport_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verification_checks_select"
  ON public.verification_checks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = verification_checks.shipment_id
        AND s.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "verification_checks_insert"
  ON public.verification_checks FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = verification_checks.shipment_id
        AND s.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "verification_checks_delete"
  ON public.verification_checks FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = verification_checks.shipment_id
        AND s.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "discrepancies_select"
  ON public.discrepancies FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = discrepancies.shipment_id
        AND s.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "discrepancies_insert"
  ON public.discrepancies FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = discrepancies.shipment_id
        AND s.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "discrepancies_update"
  ON public.discrepancies FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = discrepancies.shipment_id
        AND s.organization_id = public.get_user_organization_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = discrepancies.shipment_id
        AND s.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "discrepancies_delete"
  ON public.discrepancies FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = discrepancies.shipment_id
        AND s.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "passport_scores_select"
  ON public.passport_scores FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = passport_scores.shipment_id
        AND s.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "passport_scores_insert"
  ON public.passport_scores FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = passport_scores.shipment_id
        AND s.organization_id = public.get_user_organization_id()
    )
  );
