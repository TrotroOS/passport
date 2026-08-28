-- Risk engine, public API keys, and webhook infrastructure

CREATE TABLE public.risk_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  factor_type TEXT NOT NULL CHECK (
    factor_type IN (
      'counterparty_risk', 'documentation_risk', 'regulatory_risk',
      'classification_risk', 'route_risk', 'historical_risk'
    )
  ),
  score NUMERIC NOT NULL CHECK (score >= 0 AND score <= 100),
  weight NUMERIC NOT NULL DEFAULT 0.2 CHECK (weight >= 0 AND weight <= 1),
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_risk_factors_shipment_id ON public.risk_factors(shipment_id);
CREATE UNIQUE INDEX idx_risk_factors_shipment_factor
  ON public.risk_factors(shipment_id, factor_type);

CREATE TRIGGER risk_factors_updated_at
  BEFORE UPDATE ON public.risk_factors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  overall_risk_score NUMERIC NOT NULL CHECK (overall_risk_score >= 0 AND overall_risk_score <= 100),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  breakdown JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_risk_assessments_shipment_id ON public.risk_assessments(shipment_id);
CREATE INDEX idx_risk_assessments_created_at
  ON public.risk_assessments(shipment_id, created_at DESC);

CREATE TRIGGER risk_assessments_updated_at
  BEFORE UPDATE ON public.risk_assessments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  prefix TEXT NOT NULL,
  scopes JSONB NOT NULL DEFAULT '["read:shipment","write:shipment","read:document","write:document"]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_organization_id ON public.api_keys(organization_id);
CREATE INDEX idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX idx_api_keys_prefix ON public.api_keys(prefix);

CREATE TRIGGER api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events JSONB NOT NULL DEFAULT '["document.processed","verification.completed","regulatory.completed","risk.completed"]',
  secret TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_subscriptions_org ON public.webhook_subscriptions(organization_id);

CREATE TRIGGER webhook_subscriptions_updated_at
  BEFORE UPDATE ON public.webhook_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES public.webhook_subscriptions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'retrying')),
  response_code INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_deliveries_webhook_id ON public.webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_created_at ON public.webhook_deliveries(created_at DESC);

CREATE TRIGGER webhook_deliveries_updated_at
  BEFORE UPDATE ON public.webhook_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.risk_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "risk_factors_select"
  ON public.risk_factors FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = risk_factors.shipment_id
        AND s.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "risk_factors_insert"
  ON public.risk_factors FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = risk_factors.shipment_id
        AND s.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "risk_factors_delete"
  ON public.risk_factors FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = risk_factors.shipment_id
        AND s.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "risk_assessments_select"
  ON public.risk_assessments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = risk_assessments.shipment_id
        AND s.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "risk_assessments_insert"
  ON public.risk_assessments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = risk_assessments.shipment_id
        AND s.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "api_keys_select"
  ON public.api_keys FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "api_keys_insert"
  ON public.api_keys FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.is_org_admin()
  );

CREATE POLICY "api_keys_update"
  ON public.api_keys FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id() AND public.is_org_admin())
  WITH CHECK (organization_id = public.get_user_organization_id() AND public.is_org_admin());

CREATE POLICY "api_keys_delete"
  ON public.api_keys FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id() AND public.is_org_admin());

CREATE POLICY "webhook_subscriptions_select"
  ON public.webhook_subscriptions FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "webhook_subscriptions_insert"
  ON public.webhook_subscriptions FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.is_org_admin()
  );

CREATE POLICY "webhook_subscriptions_update"
  ON public.webhook_subscriptions FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id() AND public.is_org_admin())
  WITH CHECK (organization_id = public.get_user_organization_id() AND public.is_org_admin());

CREATE POLICY "webhook_subscriptions_delete"
  ON public.webhook_subscriptions FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id() AND public.is_org_admin());

CREATE POLICY "webhook_deliveries_select"
  ON public.webhook_deliveries FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.webhook_subscriptions ws
      WHERE ws.id = webhook_deliveries.webhook_id
        AND ws.organization_id = public.get_user_organization_id()
    )
  );
