-- Row Level Security policies

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Organizations: members can read their own org; owners/admins can update
CREATE POLICY "organizations_select_own"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (id = public.get_user_organization_id());

CREATE POLICY "organizations_update_admin"
  ON public.organizations FOR UPDATE
  TO authenticated
  USING (id = public.get_user_organization_id() AND public.is_org_admin())
  WITH CHECK (id = public.get_user_organization_id() AND public.is_org_admin());

-- Users: read own record; admins can read/manage org members
CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_select_org_admin"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.is_org_admin()
  );

CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_update_org_admin"
  ON public.users FOR UPDATE
  TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.is_org_admin()
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.is_org_admin()
  );

CREATE POLICY "users_insert_org_admin"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.is_org_admin()
  );

-- Shipments: full org-scoped access
CREATE POLICY "shipments_select"
  ON public.shipments FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "shipments_insert"
  ON public.shipments FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "shipments_update"
  ON public.shipments FOR UPDATE
  TO authenticated
  USING (organization_id = public.get_user_organization_id())
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "shipments_delete"
  ON public.shipments FOR DELETE
  TO authenticated
  USING (organization_id = public.get_user_organization_id());

-- Parties: access via shipment org
CREATE POLICY "parties_select"
  ON public.parties FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = parties.shipment_id
        AND s.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "parties_insert"
  ON public.parties FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = parties.shipment_id
        AND s.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "parties_update"
  ON public.parties FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = parties.shipment_id
        AND s.organization_id = public.get_user_organization_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = parties.shipment_id
        AND s.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "parties_delete"
  ON public.parties FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = parties.shipment_id
        AND s.organization_id = public.get_user_organization_id()
    )
  );

-- Products: access via shipment org
CREATE POLICY "products_select"
  ON public.products FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = products.shipment_id
        AND s.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "products_insert"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = products.shipment_id
        AND s.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "products_update"
  ON public.products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = products.shipment_id
        AND s.organization_id = public.get_user_organization_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = products.shipment_id
        AND s.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "products_delete"
  ON public.products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = products.shipment_id
        AND s.organization_id = public.get_user_organization_id()
    )
  );

-- Documents: org-scoped
CREATE POLICY "documents_select"
  ON public.documents FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "documents_insert"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "documents_update"
  ON public.documents FOR UPDATE
  TO authenticated
  USING (organization_id = public.get_user_organization_id())
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "documents_delete"
  ON public.documents FOR DELETE
  TO authenticated
  USING (organization_id = public.get_user_organization_id());

-- Audit events: org-scoped read; insert for org members
CREATE POLICY "audit_events_select"
  ON public.audit_events FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "audit_events_insert"
  ON public.audit_events FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id());

-- Service role bypass for signup (organizations/users initial insert)
-- Signup uses service role client, so no special policy needed for anon insert on orgs
