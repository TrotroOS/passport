-- Customs broker collaboration: collaborators, comments, readiness flags

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS owner_confirmed_ready BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS broker_confirmed_ready BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS uploaded_by_collaborator BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.shipment_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'commenter', 'editor')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'active', 'revoked', 'declined')
  ),
  invited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shipment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_shipment_collaborators_shipment
  ON public.shipment_collaborators(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_collaborators_user
  ON public.shipment_collaborators(user_id, status);

CREATE TRIGGER shipment_collaborators_updated_at
  BEFORE UPDATE ON public.shipment_collaborators
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.shipment_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipment_comments_shipment
  ON public.shipment_comments(shipment_id, created_at DESC);

CREATE TRIGGER shipment_comments_updated_at
  BEFORE UPDATE ON public.shipment_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Access helpers
CREATE OR REPLACE FUNCTION public.is_active_shipment_collaborator(p_shipment_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shipment_collaborators sc
    WHERE sc.shipment_id = p_shipment_id
      AND sc.user_id = auth.uid()
      AND sc.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_shipment_owner(p_shipment_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shipments s
    WHERE s.id = p_shipment_id
      AND s.organization_id = public.get_user_organization_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_shipment(p_shipment_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_shipment_owner(p_shipment_id)
    OR public.is_active_shipment_collaborator(p_shipment_id);
$$;

CREATE OR REPLACE FUNCTION public.collaborator_role_for_shipment(p_shipment_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sc.role
  FROM public.shipment_collaborators sc
  WHERE sc.shipment_id = p_shipment_id
    AND sc.user_id = auth.uid()
    AND sc.status = 'active'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.is_active_shipment_collaborator(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_shipment_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_shipment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.collaborator_role_for_shipment(UUID) TO authenticated;

ALTER TABLE public.shipment_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_comments ENABLE ROW LEVEL SECURITY;

-- Collaborators policies
CREATE POLICY "shipment_collaborators_select"
  ON public.shipment_collaborators FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_shipment_owner(shipment_id)
  );

CREATE POLICY "shipment_collaborators_insert"
  ON public.shipment_collaborators FOR INSERT TO authenticated
  WITH CHECK (public.is_shipment_owner(shipment_id));

CREATE POLICY "shipment_collaborators_update_owner"
  ON public.shipment_collaborators FOR UPDATE TO authenticated
  USING (public.is_shipment_owner(shipment_id))
  WITH CHECK (public.is_shipment_owner(shipment_id));

CREATE POLICY "shipment_collaborators_update_self"
  ON public.shipment_collaborators FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "shipment_collaborators_delete"
  ON public.shipment_collaborators FOR DELETE TO authenticated
  USING (public.is_shipment_owner(shipment_id));

-- Comments policies
CREATE POLICY "shipment_comments_select"
  ON public.shipment_comments FOR SELECT TO authenticated
  USING (public.can_access_shipment(shipment_id));

CREATE POLICY "shipment_comments_insert"
  ON public.shipment_comments FOR INSERT TO authenticated
  WITH CHECK (
    public.can_access_shipment(shipment_id)
    AND user_id = auth.uid()
    AND organization_id = public.get_user_organization_id()
  );

-- Extend shipment read/update for collaborators
DROP POLICY IF EXISTS "shipments_select" ON public.shipments;
CREATE POLICY "shipments_select"
  ON public.shipments FOR SELECT TO authenticated
  USING (public.can_access_shipment(id));

DROP POLICY IF EXISTS "shipments_update" ON public.shipments;
CREATE POLICY "shipments_update"
  ON public.shipments FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    OR (
      public.is_active_shipment_collaborator(id)
      AND public.collaborator_role_for_shipment(id) = 'editor'
    )
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    OR (
      public.is_active_shipment_collaborator(id)
      AND public.collaborator_role_for_shipment(id) = 'editor'
    )
  );

-- Documents: collaborators can read/upload on shared shipments
DROP POLICY IF EXISTS "documents_select" ON public.documents;
CREATE POLICY "documents_select"
  ON public.documents FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    OR public.can_access_shipment(shipment_id)
  );

DROP POLICY IF EXISTS "documents_insert" ON public.documents;
CREATE POLICY "documents_insert"
  ON public.documents FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    OR (
      public.can_access_shipment(shipment_id)
      AND public.collaborator_role_for_shipment(shipment_id) IN ('commenter', 'editor')
    )
  );

-- Child tables: allow collaborator read access
DROP POLICY IF EXISTS "parties_select" ON public.parties;
CREATE POLICY "parties_select"
  ON public.parties FOR SELECT TO authenticated
  USING (public.can_access_shipment(shipment_id));

DROP POLICY IF EXISTS "products_select" ON public.products;
CREATE POLICY "products_select"
  ON public.products FOR SELECT TO authenticated
  USING (public.can_access_shipment(shipment_id));

DROP POLICY IF EXISTS "audit_events_select" ON public.audit_events;
CREATE POLICY "audit_events_select"
  ON public.audit_events FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    OR (shipment_id IS NOT NULL AND public.can_access_shipment(shipment_id))
  );

-- Storage read for collaborators (org folder belongs to owner)
DROP POLICY IF EXISTS "passport_documents_select_collaborator" ON storage.objects;
CREATE POLICY "passport_documents_select_collaborator"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'passport-documents'
    AND public.can_access_shipment(((storage.foldername(name))[2])::uuid)
  );

-- Child analysis tables: collaborator read access
DROP POLICY IF EXISTS "verification_checks_select" ON public.verification_checks;
CREATE POLICY "verification_checks_select"
  ON public.verification_checks FOR SELECT TO authenticated
  USING (public.can_access_shipment(shipment_id));

DROP POLICY IF EXISTS "discrepancies_select" ON public.discrepancies;
CREATE POLICY "discrepancies_select"
  ON public.discrepancies FOR SELECT TO authenticated
  USING (public.can_access_shipment(shipment_id));

DROP POLICY IF EXISTS "workflow_tasks_select" ON public.workflow_tasks;
CREATE POLICY "workflow_tasks_select"
  ON public.workflow_tasks FOR SELECT TO authenticated
  USING (public.can_access_shipment(shipment_id));

DROP POLICY IF EXISTS "regulatory_checks_select" ON public.regulatory_checks;
CREATE POLICY "regulatory_checks_select"
  ON public.regulatory_checks FOR SELECT TO authenticated
  USING (public.can_access_shipment(shipment_id));

DROP POLICY IF EXISTS "passport_scores_select" ON public.passport_scores;
CREATE POLICY "passport_scores_select"
  ON public.passport_scores FOR SELECT TO authenticated
  USING (public.can_access_shipment(shipment_id));

DROP POLICY IF EXISTS "document_extractions_select" ON public.document_extractions;
CREATE POLICY "document_extractions_select"
  ON public.document_extractions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_extractions.document_id
        AND public.can_access_shipment(d.shipment_id)
    )
  );

DROP POLICY IF EXISTS "risk_assessments_select" ON public.risk_assessments;
CREATE POLICY "risk_assessments_select"
  ON public.risk_assessments FOR SELECT TO authenticated
  USING (public.can_access_shipment(shipment_id));

DROP POLICY IF EXISTS "risk_factors_select" ON public.risk_factors;
CREATE POLICY "risk_factors_select"
  ON public.risk_factors FOR SELECT TO authenticated
  USING (public.can_access_shipment(shipment_id));

DROP POLICY IF EXISTS "organizations_select_own" ON public.organizations;
CREATE POLICY "organizations_select_own"
  ON public.organizations FOR SELECT TO authenticated
  USING (
    id = public.get_user_organization_id()
    OR EXISTS (
      SELECT 1
      FROM public.shipments s
      JOIN public.shipment_collaborators sc ON sc.shipment_id = s.id
      WHERE s.organization_id = organizations.id
        AND sc.user_id = auth.uid()
        AND sc.status = 'active'
    )
  );

DROP POLICY IF EXISTS "users_select_for_invite" ON public.users;
CREATE POLICY "users_select_for_invite"
  ON public.users FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR organization_id = public.get_user_organization_id()
    OR EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.organization_id = public.get_user_organization_id()
    )
  );
