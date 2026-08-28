-- Freight forwarder & shipping API integration

CREATE TABLE IF NOT EXISTS public.container_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  container_number TEXT NOT NULL,
  container_type TEXT,
  seal_number TEXT,
  carrier TEXT,
  vessel_name TEXT,
  voyage_number TEXT,
  bill_of_lading_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shipment_id, container_number)
);

CREATE INDEX IF NOT EXISTS idx_container_details_shipment
  ON public.container_details(shipment_id);

CREATE TRIGGER container_details_updated_at
  BEFORE UPDATE ON public.container_details
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.shipment_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  container_number TEXT,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'vessel_departed',
      'vessel_arrived',
      'container_discharged',
      'customs_clearance',
      'delivery',
      'delay',
      'other'
    )
  ),
  event_date TIMESTAMPTZ,
  location TEXT,
  description TEXT,
  source TEXT,
  raw_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tracking_events_shipment_date
  ON public.shipment_tracking_events(shipment_id, event_date DESC NULLS LAST);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tracking_events_dedup
  ON public.shipment_tracking_events(
    shipment_id,
    COALESCE(container_number, ''),
    event_type,
    COALESCE(event_date, 'epoch'::timestamptz)
  );

CREATE TABLE IF NOT EXISTS public.tracking_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  api_key TEXT,
  api_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER tracking_providers_updated_at
  BEFORE UPDATE ON public.tracking_providers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.tracking_providers (name, api_url, is_active)
VALUES ('mock', NULL, true)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.container_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "container_details_select"
  ON public.container_details FOR SELECT TO authenticated
  USING (public.can_access_shipment(shipment_id));

CREATE POLICY "container_details_insert"
  ON public.container_details FOR INSERT TO authenticated
  WITH CHECK (public.can_access_shipment(shipment_id));

CREATE POLICY "container_details_update"
  ON public.container_details FOR UPDATE TO authenticated
  USING (public.can_access_shipment(shipment_id))
  WITH CHECK (public.can_access_shipment(shipment_id));

CREATE POLICY "container_details_delete"
  ON public.container_details FOR DELETE TO authenticated
  USING (
    public.is_shipment_owner(shipment_id)
    OR (
      public.is_active_shipment_collaborator(shipment_id)
      AND public.collaborator_role_for_shipment(shipment_id) = 'editor'
    )
  );

CREATE POLICY "shipment_tracking_events_select"
  ON public.shipment_tracking_events FOR SELECT TO authenticated
  USING (public.can_access_shipment(shipment_id));

CREATE POLICY "shipment_tracking_events_insert"
  ON public.shipment_tracking_events FOR INSERT TO authenticated
  WITH CHECK (public.can_access_shipment(shipment_id));

-- Provider config: platform admins only (service role bypasses RLS)
CREATE POLICY "tracking_providers_admin_select"
  ON public.tracking_providers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.is_platform_admin = true
    )
  );

CREATE POLICY "tracking_providers_admin_all"
  ON public.tracking_providers FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.is_platform_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.is_platform_admin = true
    )
  );
