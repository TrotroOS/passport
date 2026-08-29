-- Allow shipment owners to read collaborator org/user names on shared shipments.

DROP POLICY IF EXISTS "organizations_select_shipment_counterparty" ON public.organizations;
CREATE POLICY "organizations_select_shipment_counterparty"
  ON public.organizations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.shipment_collaborators sc
      WHERE sc.organization_id = organizations.id
        AND sc.status = 'active'
        AND public.is_shipment_owner(sc.shipment_id)
    )
    OR EXISTS (
      SELECT 1
      FROM public.shipment_comments c
      WHERE c.organization_id = organizations.id
        AND public.is_shipment_owner(c.shipment_id)
    )
  );

DROP POLICY IF EXISTS "users_select_shipment_counterparty" ON public.users;
CREATE POLICY "users_select_shipment_counterparty"
  ON public.users FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.shipment_collaborators sc
      WHERE sc.user_id = users.id
        AND sc.status = 'active'
        AND public.is_shipment_owner(sc.shipment_id)
    )
    OR EXISTS (
      SELECT 1
      FROM public.shipment_comments c
      WHERE c.user_id = users.id
        AND public.is_shipment_owner(c.shipment_id)
    )
  );
