-- AI HS Code Suggestion & Verification

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS hs_code_status TEXT NOT NULL DEFAULT 'not_verified'
    CHECK (hs_code_status IN ('not_verified', 'missing', 'suggested', 'verified', 'conflict'));

CREATE TABLE IF NOT EXISTS public.hs_code_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  hs_code TEXT NOT NULL,
  description_match TEXT,
  confidence NUMERIC,
  source TEXT NOT NULL DEFAULT 'ai' CHECK (source IN ('ai', 'user', 'broker', 'system')),
  is_selected BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hs_code_suggestions_product
  ON public.hs_code_suggestions(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hs_code_suggestions_shipment
  ON public.hs_code_suggestions(shipment_id);

CREATE TRIGGER hs_code_suggestions_updated_at
  BEFORE UPDATE ON public.hs_code_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.hs_code_verification_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  check_type TEXT NOT NULL CHECK (
    check_type IN (
      'missing_hs_code',
      'invalid_format',
      'description_mismatch',
      'requires_review'
    )
  ),
  status TEXT NOT NULL CHECK (
    status IN ('passed', 'failed', 'warning', 'needs_review')
  ),
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hs_code_verification_checks_shipment
  ON public.hs_code_verification_checks(shipment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hs_code_verification_checks_product
  ON public.hs_code_verification_checks(product_id);

CREATE TRIGGER hs_code_verification_checks_updated_at
  BEFORE UPDATE ON public.hs_code_verification_checks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.ai_provider_logs
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS operation TEXT;

CREATE INDEX IF NOT EXISTS idx_ai_provider_logs_product_id
  ON public.ai_provider_logs(product_id);

ALTER TABLE public.workflow_tasks DROP CONSTRAINT IF EXISTS workflow_tasks_task_type_check;
ALTER TABLE public.workflow_tasks ADD CONSTRAINT workflow_tasks_task_type_check CHECK (
  task_type IN (
    'obtain_document',
    'resolve_discrepancy',
    'verify_permit',
    'contact_authority',
    'provide_info',
    'other',
    'verify_hs_code'
  )
);

ALTER TABLE public.hs_code_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hs_code_verification_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hs_code_suggestions_select"
  ON public.hs_code_suggestions FOR SELECT TO authenticated
  USING (public.can_access_shipment(shipment_id));

CREATE POLICY "hs_code_suggestions_insert"
  ON public.hs_code_suggestions FOR INSERT TO authenticated
  WITH CHECK (public.can_access_shipment(shipment_id));

CREATE POLICY "hs_code_suggestions_update"
  ON public.hs_code_suggestions FOR UPDATE TO authenticated
  USING (public.can_access_shipment(shipment_id))
  WITH CHECK (public.can_access_shipment(shipment_id));

CREATE POLICY "hs_code_verification_checks_select"
  ON public.hs_code_verification_checks FOR SELECT TO authenticated
  USING (public.can_access_shipment(shipment_id));

CREATE POLICY "hs_code_verification_checks_insert"
  ON public.hs_code_verification_checks FOR INSERT TO authenticated
  WITH CHECK (public.can_access_shipment(shipment_id));

CREATE POLICY "hs_code_verification_checks_update"
  ON public.hs_code_verification_checks FOR UPDATE TO authenticated
  USING (public.can_access_shipment(shipment_id))
  WITH CHECK (public.can_access_shipment(shipment_id));

CREATE POLICY "hs_code_verification_checks_delete"
  ON public.hs_code_verification_checks FOR DELETE TO authenticated
  USING (public.can_access_shipment(shipment_id));

DROP POLICY IF EXISTS "products_select" ON public.products;
CREATE POLICY "products_select"
  ON public.products FOR SELECT TO authenticated
  USING (public.can_access_shipment(shipment_id));

DROP POLICY IF EXISTS "products_update" ON public.products;
CREATE POLICY "products_update"
  ON public.products FOR UPDATE TO authenticated
  USING (
    public.is_shipment_owner(shipment_id)
    OR (
      public.is_active_shipment_collaborator(shipment_id)
      AND public.collaborator_role_for_shipment(shipment_id) IN ('commenter', 'editor')
    )
  )
  WITH CHECK (
    public.is_shipment_owner(shipment_id)
    OR (
      public.is_active_shipment_collaborator(shipment_id)
      AND public.collaborator_role_for_shipment(shipment_id) IN ('commenter', 'editor')
    )
  );
