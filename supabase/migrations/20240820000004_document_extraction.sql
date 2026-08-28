-- Document extraction and AI pipeline schema

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS processing_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (processing_status IN ('pending', 'processing', 'processed', 'failed', 'needs_review')),
  ADD COLUMN IF NOT EXISTS doc_type_ai TEXT,
  ADD COLUMN IF NOT EXISTS doc_type_confidence NUMERIC;

CREATE INDEX IF NOT EXISTS idx_documents_processing_status ON public.documents(processing_status);

CREATE TABLE public.document_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  extraction_type TEXT NOT NULL,
  extracted_data JSONB NOT NULL DEFAULT '{}',
  confidence NUMERIC,
  is_arbiter_approved BOOLEAN NOT NULL DEFAULT false,
  needs_human_review BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_extractions_document_id ON public.document_extractions(document_id);

CREATE TRIGGER document_extractions_updated_at
  BEFORE UPDATE ON public.document_extractions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.ai_provider_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost NUMERIC,
  latency_ms INTEGER,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'rate_limited')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_provider_logs_document_id ON public.ai_provider_logs(document_id);
CREATE INDEX idx_ai_provider_logs_organization_id ON public.ai_provider_logs(organization_id);

CREATE TABLE public.arbiter_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  rule_id TEXT NOT NULL,
  rule_description TEXT,
  passed BOOLEAN NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error')),
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_arbiter_events_document_id ON public.arbiter_events(document_id);

-- RLS
ALTER TABLE public.document_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_provider_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arbiter_events ENABLE ROW LEVEL SECURITY;

-- document_extractions: access via document -> shipment -> org
CREATE POLICY "document_extractions_select"
  ON public.document_extractions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.shipments s ON s.id = d.shipment_id
      WHERE d.id = document_extractions.document_id
        AND s.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "document_extractions_insert"
  ON public.document_extractions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.shipments s ON s.id = d.shipment_id
      WHERE d.id = document_extractions.document_id
        AND s.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "document_extractions_update"
  ON public.document_extractions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.shipments s ON s.id = d.shipment_id
      WHERE d.id = document_extractions.document_id
        AND s.organization_id = public.get_user_organization_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.shipments s ON s.id = d.shipment_id
      WHERE d.id = document_extractions.document_id
        AND s.organization_id = public.get_user_organization_id()
    )
  );

-- ai_provider_logs: org-scoped via organization_id
CREATE POLICY "ai_provider_logs_select"
  ON public.ai_provider_logs FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "ai_provider_logs_insert"
  ON public.ai_provider_logs FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id());

-- arbiter_events: access via document -> shipment -> org
CREATE POLICY "arbiter_events_select"
  ON public.arbiter_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.shipments s ON s.id = d.shipment_id
      WHERE d.id = arbiter_events.document_id
        AND s.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "arbiter_events_insert"
  ON public.arbiter_events FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.shipments s ON s.id = d.shipment_id
      WHERE d.id = arbiter_events.document_id
        AND s.organization_id = public.get_user_organization_id()
    )
  );
