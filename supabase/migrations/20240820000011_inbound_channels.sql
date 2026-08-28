-- WhatsApp & Email document ingestion

-- Phone number for WhatsApp user matching
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);

-- Inbound channel registrations (per-org, admin-managed)
CREATE TABLE public.inbound_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('email', 'whatsapp')),
  channel_address TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, channel_type, channel_address)
);

CREATE INDEX idx_inbound_channels_org ON public.inbound_channels(organization_id);

-- Inbound messages (organization-scoped audit trail)
CREATE TABLE public.inbound_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE SET NULL,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('email', 'whatsapp')),
  sender_address TEXT NOT NULL,
  subject TEXT,
  body_text TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inbound_messages_org ON public.inbound_messages(organization_id);
CREATE INDEX idx_inbound_messages_received ON public.inbound_messages(received_at DESC);

-- Inbound attachments metadata
CREATE TABLE public.inbound_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inbound_message_id UUID NOT NULL REFERENCES public.inbound_messages(id) ON DELETE CASCADE,
  file_name TEXT,
  mime_type TEXT,
  file_path TEXT NOT NULL,
  size_bytes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inbound_attachments_message ON public.inbound_attachments(inbound_message_id);

-- Normalized shipment reference aliases for faster lookup
CREATE TABLE public.shipment_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  reference_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, reference_text)
);

CREATE INDEX idx_shipment_references_lookup ON public.shipment_references(organization_id, reference_text);

-- Document ingestion source tracking
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS ingestion_source TEXT
  CHECK (ingestion_source IS NULL OR ingestion_source IN ('manual', 'email', 'whatsapp'));
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS inbound_message_id UUID
  REFERENCES public.inbound_messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_inbound_message ON public.documents(inbound_message_id);

-- Keep shipment_references in sync when shipments are created
CREATE OR REPLACE FUNCTION public.sync_shipment_reference()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.shipment_references (organization_id, shipment_id, reference_text)
  VALUES (NEW.organization_id, NEW.id, lower(trim(NEW.shipment_ref)))
  ON CONFLICT (organization_id, reference_text) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_shipment_reference ON public.shipments;
CREATE TRIGGER trg_sync_shipment_reference
  AFTER INSERT ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.sync_shipment_reference();

-- Backfill existing shipments
INSERT INTO public.shipment_references (organization_id, shipment_id, reference_text)
SELECT organization_id, id, lower(trim(shipment_ref))
FROM public.shipments
ON CONFLICT (organization_id, reference_text) DO NOTHING;

-- RLS
ALTER TABLE public.inbound_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbound_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbound_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inbound_channels_select"
  ON public.inbound_channels FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "inbound_channels_insert_admin"
  ON public.inbound_channels FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id() AND public.is_org_admin());

CREATE POLICY "inbound_channels_update_admin"
  ON public.inbound_channels FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id() AND public.is_org_admin())
  WITH CHECK (organization_id = public.get_user_organization_id() AND public.is_org_admin());

CREATE POLICY "inbound_messages_select"
  ON public.inbound_messages FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "inbound_attachments_select"
  ON public.inbound_attachments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.inbound_messages m
    WHERE m.id = inbound_attachments.inbound_message_id
      AND m.organization_id = public.get_user_organization_id()
  ));

CREATE POLICY "shipment_references_select"
  ON public.shipment_references FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());
