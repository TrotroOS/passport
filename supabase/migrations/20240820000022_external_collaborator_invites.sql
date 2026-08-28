-- Allow inviting collaborators who do not yet have a Passport account

ALTER TABLE public.shipment_collaborators
  ADD COLUMN IF NOT EXISTS invitee_email TEXT,
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN organization_id DROP NOT NULL;

ALTER TABLE public.shipment_collaborators
  DROP CONSTRAINT IF EXISTS shipment_collaborators_shipment_id_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_shipment_collaborators_shipment_user
  ON public.shipment_collaborators(shipment_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_shipment_collaborators_shipment_invitee_email
  ON public.shipment_collaborators(shipment_id, lower(invitee_email))
  WHERE invitee_email IS NOT NULL AND status IN ('pending', 'active');

ALTER TABLE public.shipment_collaborators
  ADD CONSTRAINT shipment_collaborators_invitee_or_user_chk CHECK (
    user_id IS NOT NULL OR invitee_email IS NOT NULL
  );

CREATE OR REPLACE FUNCTION public.invitation_email_matches_auth_user(p_invitee_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_invitee_email IS NOT NULL
    AND lower(p_invitee_email) = lower(
      (SELECT email FROM public.users WHERE id = auth.uid())
    );
$$;

GRANT EXECUTE ON FUNCTION public.invitation_email_matches_auth_user(TEXT) TO authenticated;

DROP POLICY IF EXISTS "shipment_collaborators_select" ON public.shipment_collaborators;
CREATE POLICY "shipment_collaborators_select"
  ON public.shipment_collaborators FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_shipment_owner(shipment_id)
    OR public.invitation_email_matches_auth_user(invitee_email)
  );

DROP POLICY IF EXISTS "shipment_collaborators_update_self" ON public.shipment_collaborators;
CREATE POLICY "shipment_collaborators_update_self"
  ON public.shipment_collaborators FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.invitation_email_matches_auth_user(invitee_email)
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.invitation_email_matches_auth_user(invitee_email)
  );

-- Reload PostgREST schema cache so invitee_email is visible immediately
NOTIFY pgrst, 'reload schema';
