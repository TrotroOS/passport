-- Passport: apply all pending migrations (003–015 after initial schema 001/002)
-- Regenerate with: node scripts/rebuild_apply_all_pending.mjs
-- Paste entire file in Supabase SQL Editor if CLI apply-migrations fails.

-- ===== 20240820000010_fix_rls_reapply.sql =====
-- Re-apply core RLS policies (safe to run if migration 002 failed or was skipped)
-- Run this in Supabase SQL Editor if you see:
--   "new row violates row-level security policy for table shipments"

-- Drop existing policies (ignore errors if missing)
DROP POLICY IF EXISTS "organizations_select_own" ON public.organizations;
DROP POLICY IF EXISTS "organizations_update_admin" ON public.organizations;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_select_org_admin" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_update_org_admin" ON public.users;
DROP POLICY IF EXISTS "users_insert_org_admin" ON public.users;
DROP POLICY IF EXISTS "shipments_select" ON public.shipments;
DROP POLICY IF EXISTS "shipments_insert" ON public.shipments;
DROP POLICY IF EXISTS "shipments_update" ON public.shipments;
DROP POLICY IF EXISTS "shipments_delete" ON public.shipments;
DROP POLICY IF EXISTS "parties_select" ON public.parties;
DROP POLICY IF EXISTS "parties_insert" ON public.parties;
DROP POLICY IF EXISTS "parties_update" ON public.parties;
DROP POLICY IF EXISTS "parties_delete" ON public.parties;
DROP POLICY IF EXISTS "products_select" ON public.products;
DROP POLICY IF EXISTS "products_insert" ON public.products;
DROP POLICY IF EXISTS "products_update" ON public.products;
DROP POLICY IF EXISTS "products_delete" ON public.products;
DROP POLICY IF EXISTS "documents_select" ON public.documents;
DROP POLICY IF EXISTS "documents_insert" ON public.documents;
DROP POLICY IF EXISTS "documents_update" ON public.documents;
DROP POLICY IF EXISTS "documents_delete" ON public.documents;
DROP POLICY IF EXISTS "audit_events_select" ON public.audit_events;
DROP POLICY IF EXISTS "audit_events_insert" ON public.audit_events;

-- Ensure RLS is enabled
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Table grants for authenticated role
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Organizations
CREATE POLICY "organizations_select_own"
  ON public.organizations FOR SELECT TO authenticated
  USING (id = public.get_user_organization_id());

CREATE POLICY "organizations_update_admin"
  ON public.organizations FOR UPDATE TO authenticated
  USING (id = public.get_user_organization_id() AND public.is_org_admin())
  WITH CHECK (id = public.get_user_organization_id() AND public.is_org_admin());

-- Users
CREATE POLICY "users_select_own"
  ON public.users FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_select_org_admin"
  ON public.users FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id() AND public.is_org_admin());

CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "users_update_org_admin"
  ON public.users FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id() AND public.is_org_admin())
  WITH CHECK (organization_id = public.get_user_organization_id() AND public.is_org_admin());

CREATE POLICY "users_insert_org_admin"
  ON public.users FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id() AND public.is_org_admin());

-- Shipments
CREATE POLICY "shipments_select"
  ON public.shipments FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "shipments_insert"
  ON public.shipments FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "shipments_update"
  ON public.shipments FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id())
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "shipments_delete"
  ON public.shipments FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id());

-- Parties
CREATE POLICY "parties_select"
  ON public.parties FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.shipments s
    WHERE s.id = parties.shipment_id AND s.organization_id = public.get_user_organization_id()
  ));

CREATE POLICY "parties_insert"
  ON public.parties FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.shipments s
    WHERE s.id = parties.shipment_id AND s.organization_id = public.get_user_organization_id()
  ));

CREATE POLICY "parties_update"
  ON public.parties FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.shipments s
    WHERE s.id = parties.shipment_id AND s.organization_id = public.get_user_organization_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.shipments s
    WHERE s.id = parties.shipment_id AND s.organization_id = public.get_user_organization_id()
  ));

CREATE POLICY "parties_delete"
  ON public.parties FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.shipments s
    WHERE s.id = parties.shipment_id AND s.organization_id = public.get_user_organization_id()
  ));

-- Products
CREATE POLICY "products_select"
  ON public.products FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.shipments s
    WHERE s.id = products.shipment_id AND s.organization_id = public.get_user_organization_id()
  ));

CREATE POLICY "products_insert"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.shipments s
    WHERE s.id = products.shipment_id AND s.organization_id = public.get_user_organization_id()
  ));

CREATE POLICY "products_update"
  ON public.products FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.shipments s
    WHERE s.id = products.shipment_id AND s.organization_id = public.get_user_organization_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.shipments s
    WHERE s.id = products.shipment_id AND s.organization_id = public.get_user_organization_id()
  ));

CREATE POLICY "products_delete"
  ON public.products FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.shipments s
    WHERE s.id = products.shipment_id AND s.organization_id = public.get_user_organization_id()
  ));

-- Documents
CREATE POLICY "documents_select"
  ON public.documents FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "documents_insert"
  ON public.documents FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "documents_update"
  ON public.documents FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id())
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "documents_delete"
  ON public.documents FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id());

-- Audit events
CREATE POLICY "audit_events_select"
  ON public.audit_events FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "audit_events_insert"
  ON public.audit_events FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id());

-- ===== 20240820000003_storage.sql =====
-- Storage bucket for shipment documents

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'passport-documents',
  'passport-documents',
  false,
  20971520,
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/csv'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies: org members can access files under their organization folder
DROP POLICY IF EXISTS "passport_documents_select" ON storage.objects;
DROP POLICY IF EXISTS "passport_documents_insert" ON storage.objects;
DROP POLICY IF EXISTS "passport_documents_update" ON storage.objects;
DROP POLICY IF EXISTS "passport_documents_delete" ON storage.objects;

CREATE POLICY "passport_documents_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'passport-documents'
    AND (storage.foldername(name))[1] = public.get_user_organization_id()::text
  );

CREATE POLICY "passport_documents_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'passport-documents'
    AND (storage.foldername(name))[1] = public.get_user_organization_id()::text
  );

CREATE POLICY "passport_documents_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'passport-documents'
    AND (storage.foldername(name))[1] = public.get_user_organization_id()::text
  )
  WITH CHECK (
    bucket_id = 'passport-documents'
    AND (storage.foldername(name))[1] = public.get_user_organization_id()::text
  );

CREATE POLICY "passport_documents_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'passport-documents'
    AND (storage.foldername(name))[1] = public.get_user_organization_id()::text
  );

-- ===== 20240820000004_document_extraction.sql =====
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

-- ===== 20240820000005_document_processing_error.sql =====
-- Add processing_error column for failed document visibility

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS processing_error TEXT;

-- ===== 20240820000006_verification_passport_score.sql =====
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

-- ===== 20240820000007_regulatory_workflow.sql =====
-- Regulatory compliance knowledge graph and workflow orchestration

CREATE TABLE public.jurisdictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.regulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_id UUID REFERENCES public.jurisdictions(id),
  product_category_id UUID REFERENCES public.product_categories(id),
  title TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL CHECK (
    rule_type IN (
      'document_required', 'permit_required', 'inspection_required',
      'registration_required', 'restriction'
    )
  ),
  required_document_type TEXT,
  authority TEXT,
  source_url TEXT,
  source_text TEXT,
  effective_date DATE,
  expiry_date DATE,
  confidence NUMERIC NOT NULL DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_regulations_jurisdiction ON public.regulations(jurisdiction_id);
CREATE INDEX idx_regulations_category ON public.regulations(product_category_id);
CREATE INDEX idx_regulations_active ON public.regulations(is_active) WHERE is_active = true;

CREATE TRIGGER regulations_updated_at
  BEFORE UPDATE ON public.regulations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.regulatory_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  regulation_id UUID REFERENCES public.regulations(id),
  check_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('passed', 'failed', 'needs_review', 'not_applicable')
  ),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_regulatory_checks_shipment_id ON public.regulatory_checks(shipment_id);
CREATE UNIQUE INDEX idx_regulatory_checks_shipment_regulation
  ON public.regulatory_checks(shipment_id, regulation_id)
  WHERE regulation_id IS NOT NULL;

CREATE TRIGGER regulatory_checks_updated_at
  BEFORE UPDATE ON public.regulatory_checks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.workflow_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL CHECK (
    task_type IN (
      'obtain_document', 'resolve_discrepancy', 'verify_permit',
      'contact_authority', 'provide_info', 'other'
    )
  ),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (
    priority IN ('low', 'medium', 'high', 'urgent')
  ),
  status TEXT NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'in_progress', 'done', 'blocked', 'not_applicable')
  ),
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  related_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  related_regulation_id UUID REFERENCES public.regulations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_tasks_shipment_id ON public.workflow_tasks(shipment_id);
CREATE INDEX idx_workflow_tasks_status ON public.workflow_tasks(status);
CREATE UNIQUE INDEX idx_workflow_tasks_dedup
  ON public.workflow_tasks(shipment_id, task_type, title);

CREATE TRIGGER workflow_tasks_updated_at
  BEFORE UPDATE ON public.workflow_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Link products to regulatory categories
ALTER TABLE public.products
  ADD COLUMN product_category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL;

CREATE INDEX idx_products_category ON public.products(product_category_id);

-- RLS
ALTER TABLE public.jurisdictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulatory_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_tasks ENABLE ROW LEVEL SECURITY;

-- Reference data: read by all authenticated users
CREATE POLICY "jurisdictions_select"
  ON public.jurisdictions FOR SELECT TO authenticated USING (true);

CREATE POLICY "product_categories_select"
  ON public.product_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "regulations_select"
  ON public.regulations FOR SELECT TO authenticated USING (true);

-- Regulatory checks: org-scoped via shipment
CREATE POLICY "regulatory_checks_select"
  ON public.regulatory_checks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = regulatory_checks.shipment_id
        AND s.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "regulatory_checks_insert"
  ON public.regulatory_checks FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = regulatory_checks.shipment_id
        AND s.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "regulatory_checks_update"
  ON public.regulatory_checks FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = regulatory_checks.shipment_id
        AND s.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "regulatory_checks_delete"
  ON public.regulatory_checks FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = regulatory_checks.shipment_id
        AND s.organization_id = public.get_user_organization_id()
    )
  );

-- Workflow tasks: org-scoped via shipment
CREATE POLICY "workflow_tasks_select"
  ON public.workflow_tasks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = workflow_tasks.shipment_id
        AND s.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "workflow_tasks_insert"
  ON public.workflow_tasks FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = workflow_tasks.shipment_id
        AND s.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "workflow_tasks_update"
  ON public.workflow_tasks FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = workflow_tasks.shipment_id
        AND s.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "workflow_tasks_delete"
  ON public.workflow_tasks FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.id = workflow_tasks.shipment_id
        AND s.organization_id = public.get_user_organization_id()
    )
  );

-- Seed: jurisdiction
INSERT INTO public.jurisdictions (code, name) VALUES ('GH', 'Ghana');

-- Seed: product categories
INSERT INTO public.product_categories (code, name, description) VALUES
  ('electronics', 'Electronics', 'Electronic devices and components'),
  ('machinery', 'Machinery', 'Industrial machinery and equipment'),
  ('auto_parts', 'Auto Parts', 'Vehicle parts and accessories'),
  ('building_materials', 'Building Materials', 'Construction and building supplies'),
  ('food', 'Food', 'Food products for human consumption'),
  ('beverages', 'Beverages', 'Drinks and liquid food products'),
  ('pharmaceuticals', 'Pharmaceuticals', 'Medicines and pharmaceutical products'),
  ('cosmetics', 'Cosmetics', 'Cosmetic and personal care products'),
  ('chemicals', 'Chemicals', 'Industrial and consumer chemicals'),
  ('textiles', 'Textiles', 'Fabrics, garments, and textile products'),
  ('furniture', 'Furniture', 'Furniture and furnishings'),
  ('toys', 'Toys', 'Toys and children''s products'),
  ('medical_devices', 'Medical Devices', 'Medical equipment and devices'),
  ('agricultural_products', 'Agricultural Products', 'Agricultural commodities and produce'),
  ('general_consumer_goods', 'General Consumer Goods', 'General imported consumer goods');

-- Seed: Ghana regulations (deterministic, source-backed)
INSERT INTO public.regulations (
  jurisdiction_id, product_category_id, title, description, rule_type,
  required_document_type, authority, source_url, source_text,
  effective_date, confidence
)
SELECT
  j.id, pc.id, r.title, r.description, r.rule_type,
  r.required_document_type, r.authority, r.source_url, r.source_text,
  r.effective_date::date, r.confidence
FROM public.jurisdictions j
CROSS JOIN (VALUES
  ('food', 'FDA Import Permit Required', 'Food products imported into Ghana require an FDA import permit prior to clearance.', 'permit_required', 'fda_import_permit', 'FDA Ghana', 'https://fda.gov.gh/import-export/', 'All imported food products must obtain FDA import permit before customs clearance.', '2024-01-01', 1.0),
  ('food', 'Health Certificate from Exporting Country', 'Food imports require a health certificate issued by the competent authority in the country of export.', 'document_required', 'health_certificate', 'FDA Ghana', 'https://fda.gov.gh/import-export/', 'Health certificate from exporting country required for food imports.', '2024-01-01', 0.9),
  ('pharmaceuticals', 'FDA Pharmaceutical Registration', 'Pharmaceutical products must be registered with FDA Ghana before import.', 'registration_required', 'fda_registration', 'FDA Ghana', 'https://fda.gov.gh/product-registration/', 'All pharmaceutical products require FDA registration prior to import.', '2024-01-01', 1.0),
  ('pharmaceuticals', 'FDA Import Permit for Pharmaceuticals', 'Registered pharmaceuticals require a specific import permit for each shipment.', 'permit_required', 'fda_import_permit', 'FDA Ghana', 'https://fda.gov.gh/import-export/', 'Import permit required for each consignment of pharmaceutical products.', '2024-01-01', 1.0),
  ('pharmaceuticals', 'Batch Certificate Required', 'Pharmaceutical imports must include batch certificate for each lot.', 'document_required', 'batch_certificate', 'FDA Ghana', 'https://fda.gov.gh/import-export/', 'Batch certificate must accompany pharmaceutical imports.', '2024-01-01', 0.9),
  ('pharmaceuticals', 'GMP Certificate Required', 'Pharmaceutical imports require Good Manufacturing Practice certificate from manufacturer.', 'document_required', 'gmp_certificate', 'FDA Ghana', 'https://fda.gov.gh/import-export/', 'GMP certificate from manufacturing site required.', '2024-01-01', 0.9),
  ('cosmetics', 'FDA Cosmetics Registration', 'Cosmetic products must be registered with FDA Ghana before import.', 'registration_required', 'fda_registration', 'FDA Ghana', 'https://fda.gov.gh/product-registration/', 'Cosmetic products require FDA registration prior to import.', '2024-01-01', 1.0),
  ('beverages', 'FDA Beverage Registration', 'Beverage products must be registered with FDA Ghana.', 'registration_required', 'fda_registration', 'FDA Ghana', 'https://fda.gov.gh/product-registration/', 'All beverage products require FDA registration.', '2024-01-01', 1.0),
  ('electronics', 'GSA Type Approval Inspection', 'Electronics may require Ghana Standards Authority type approval or inspection.', 'inspection_required', 'gsa_type_approval', 'Ghana Standards Authority', 'https://gsa.gov.gh/', 'Electronic equipment may require GSA type approval before import.', '2024-01-01', 0.9),
  ('chemicals', 'EPA Import Permit', 'Chemical imports require Environmental Protection Agency permit.', 'permit_required', 'epa_permit', 'EPA Ghana', 'https://epa.gov.gh/', 'Import of chemicals requires EPA permit and compliance assessment.', '2024-01-01', 1.0),
  ('agricultural_products', 'Plant Quarantine Permit', 'Agricultural products require phytosanitary clearance and plant quarantine permit.', 'permit_required', 'plant_quarantine_permit', 'Plant Quarantine Directorate', 'https://mofa.gov.gh/', 'Plant and agricultural imports require phytosanitary certificate and quarantine clearance.', '2024-01-01', 1.0),
  ('general_consumer_goods', 'Import Declaration Form (IDF)', 'All commercial imports into Ghana require an Import Declaration Form.', 'document_required', 'import_declaration', 'GRA Customs', 'https://gra.gov.gh/', 'Import Declaration Form required for all commercial imports.', '2024-01-01', 1.0),
  ('general_consumer_goods', 'TIN and Customs Registration', 'Importers must have valid TIN and be registered with Ghana Revenue Authority Customs.', 'registration_required', 'tin_registration', 'GRA Customs', 'https://gra.gov.gh/', 'Valid Tax Identification Number and customs registration required for all importers.', '2024-01-01', 1.0),
  ('auto_parts', 'Used Goods Special Inspection', 'Used vehicle parts and used goods may require special customs inspection.', 'inspection_required', 'used_goods_inspection', 'GRA Customs', 'https://gra.gov.gh/', 'Used goods imports subject to special inspection and valuation.', '2024-01-01', 0.9),
  ('auto_parts', 'VIN Verification for Vehicles', 'Vehicle imports require VIN verification and duty assessment.', 'inspection_required', 'vin_verification', 'GRA Customs', 'https://gra.gov.gh/', 'Vehicle identification number verification required for motor vehicle imports.', '2024-01-01', 1.0),
  ('medical_devices', 'FDA Medical Device Registration', 'Medical devices must be registered with FDA Ghana before import.', 'registration_required', 'fda_registration', 'FDA Ghana', 'https://fda.gov.gh/product-registration/', 'Medical devices require FDA registration prior to import.', '2024-01-01', 1.0),
  ('building_materials', 'GSA Standards Certification', 'Building materials may require Ghana Standards Authority certification.', 'document_required', 'gsa_certification', 'Ghana Standards Authority', 'https://gsa.gov.gh/', 'Building materials must comply with Ghana standards and may require GSA certification.', '2024-01-01', 0.9),
  ('textiles', 'Textile Import License', 'Textile imports may require an import license from the Ministry of Trade.', 'permit_required', 'textile_import_license', 'Ministry of Trade and Industry', 'https://moti.gov.gh/', 'Textile imports subject to import licensing requirements.', '2024-01-01', 0.9),
  ('toys', 'GSA Toy Safety Certification', 'Toys imported into Ghana require safety certification.', 'document_required', 'gsa_safety_certificate', 'Ghana Standards Authority', 'https://gsa.gov.gh/', 'Toys must meet Ghana safety standards and require GSA certification.', '2024-01-01', 0.9),
  ('general_consumer_goods', 'Bill of Lading or Waybill', 'All commercial imports require a bill of lading or air waybill.', 'document_required', 'bill_of_lading', 'GRA Customs', 'https://gra.gov.gh/', 'Bill of lading or waybill required for customs clearance.', '2024-01-01', 1.0),
  ('general_consumer_goods', 'HS Code Classification', 'All imported goods must be classified with the correct HS code.', 'registration_required', 'hs_code', 'GRA Customs', 'https://gra.gov.gh/', 'Correct Harmonized System classification required for all imports.', '2024-01-01', 1.0),
  ('general_consumer_goods', 'Certificate of Conformity', 'Certain goods require a Certificate of Conformity from an approved inspection body.', 'document_required', 'certificate_of_conformity', 'Ghana Standards Authority', 'https://gsa.gov.gh/', 'Certificate of Conformity may be required for regulated product categories.', '2024-01-01', 0.9)
) AS r(category_code, title, description, rule_type, required_document_type, authority, source_url, source_text, effective_date, confidence)
JOIN public.product_categories pc ON pc.code = r.category_code
WHERE j.code = 'GH';

-- ===== 20240820000008_risk_api_webhooks.sql =====
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

-- ===== 20240820000009_pilot_admin_feedback.sql =====
-- Pilot administration and feedback system

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_users_platform_admin ON public.users(is_platform_admin)
  WHERE is_platform_admin = true;

CREATE TABLE public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  route TEXT,
  method TEXT,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  severity TEXT NOT NULL DEFAULT 'error' CHECK (severity IN ('error', 'warning', 'info')),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_error_logs_organization_id ON public.error_logs(organization_id);
CREATE INDEX idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX idx_error_logs_severity ON public.error_logs(severity);

CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature', 'suggestion', 'other')),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'closed')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_organization_id ON public.feedback(organization_id);
CREATE INDEX idx_feedback_status ON public.feedback(status);
CREATE INDEX idx_feedback_created_at ON public.feedback(created_at DESC);

CREATE TRIGGER feedback_updated_at
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert feedback for their org
CREATE POLICY "feedback_insert_own_org"
  ON public.feedback FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id = public.get_user_organization_id()
  );

CREATE POLICY "feedback_select_own_org"
  ON public.feedback FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

-- Error logs: org members can insert (for client-side reporting)
CREATE POLICY "error_logs_insert_own_org"
  ON public.error_logs FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IS NULL
    OR organization_id = public.get_user_organization_id()
  );

CREATE POLICY "error_logs_select_own_org"
  ON public.error_logs FOR SELECT TO authenticated
  USING (
    organization_id IS NULL
    OR organization_id = public.get_user_organization_id()
  );

-- ===== 20240820000011_inbound_channels.sql =====
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

-- ===== 20240820000012_trade_abbreviations_incoterms.sql =====
-- Trade abbreviations and Incoterms integration

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS incoterm TEXT;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS detected_abbreviation TEXT;

CREATE TABLE IF NOT EXISTS public.document_abbreviations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  abbreviation TEXT NOT NULL,
  canonical_doc_type TEXT NOT NULL CHECK (
    canonical_doc_type IN (
      'invoice', 'packing_list', 'bill_of_lading', 'certificate',
      'import_declaration', 'other'
    )
  ),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (abbreviation)
);

CREATE INDEX IF NOT EXISTS idx_document_abbreviations_active
  ON public.document_abbreviations (abbreviation)
  WHERE is_active = true;

CREATE TRIGGER document_abbreviations_updated_at
  BEFORE UPDATE ON public.document_abbreviations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.incoterms (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  risk_transfer_point TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.document_abbreviations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incoterms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document_abbreviations_select"
  ON public.document_abbreviations FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "incoterms_select"
  ON public.incoterms FOR SELECT TO authenticated
  USING (true);

-- Writes managed via platform admin API (service role)

INSERT INTO public.document_abbreviations (abbreviation, canonical_doc_type, description)
VALUES
  ('CI', 'invoice', 'Commercial Invoice'),
  ('PL', 'packing_list', 'Packing List'),
  ('BL', 'bill_of_lading', 'Bill of Lading'),
  ('HBL', 'bill_of_lading', 'House Bill of Lading'),
  ('AWB', 'bill_of_lading', 'Air Waybill'),
  ('HAWB', 'bill_of_lading', 'House Air Waybill'),
  ('MAWB', 'bill_of_lading', 'Master Air Waybill'),
  ('COO', 'certificate', 'Certificate of Origin'),
  ('COC', 'certificate', 'Certificate of Conformity'),
  ('MSDS', 'other', 'Material Safety Data Sheet'),
  ('POD', 'other', 'Proof of Delivery'),
  ('ISF', 'other', 'Importer Security Filing'),
  ('ENS', 'other', 'Entry Summary Declaration'),
  ('DI', 'import_declaration', 'Import Declaration'),
  ('DO', 'other', 'Delivery Order'),
  ('PO', 'other', 'Purchase Order'),
  ('SO', 'other', 'Sales Order')
ON CONFLICT (abbreviation) DO NOTHING;

INSERT INTO public.incoterms (code, name, description, risk_transfer_point)
VALUES
  ('EXW', 'Ex Works', 'Seller makes goods available at their premises.', 'At seller premises'),
  ('FCA', 'Free Carrier', 'Seller delivers goods to carrier nominated by buyer.', 'When handed to carrier'),
  ('FAS', 'Free Alongside Ship', 'Seller delivers when goods are alongside the vessel.', 'Alongside vessel at port'),
  ('FOB', 'Free On Board', 'Seller delivers when goods are on board the vessel.', 'On board vessel at port of loading'),
  ('CFR', 'Cost and Freight', 'Seller pays cost and freight to destination port.', 'On board vessel at port of loading'),
  ('CIF', 'Cost Insurance and Freight', 'Seller pays cost, insurance, and freight to destination port.', 'On board vessel at port of loading'),
  ('CPT', 'Carriage Paid To', 'Seller pays freight to named destination.', 'When handed to first carrier'),
  ('CIP', 'Carriage and Insurance Paid To', 'Seller pays freight and insurance to named destination.', 'When handed to first carrier'),
  ('DAP', 'Delivered At Place', 'Seller delivers when goods are available for unloading at destination.', 'Named place of destination'),
  ('DPU', 'Delivered at Place Unloaded', 'Seller delivers when goods are unloaded at named place.', 'Named place of destination unloaded'),
  ('DDP', 'Delivered Duty Paid', 'Seller delivers when goods are cleared for import at destination.', 'Named place of destination cleared')
ON CONFLICT (code) DO NOTHING;

-- ===== 20240820000013_customs_broker_collaboration.sql =====
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

-- ===== 20240820000014_hs_code_suggestion_verification.sql =====
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

-- ===== 20240820000015_analytics_indexes.sql =====
-- Analytics performance indexes (read-heavy org-scoped queries)

CREATE INDEX IF NOT EXISTS idx_shipments_org_created
  ON public.shipments(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_shipment_id
  ON public.products(shipment_id);

CREATE INDEX IF NOT EXISTS idx_documents_shipment_id
  ON public.documents(shipment_id);

CREATE INDEX IF NOT EXISTS idx_discrepancies_shipment_status
  ON public.discrepancies(shipment_id, status);

CREATE INDEX IF NOT EXISTS idx_regulatory_checks_shipment_id
  ON public.regulatory_checks(shipment_id);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_shipment_created
  ON public.risk_assessments(shipment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_passport_scores_shipment_created
  ON public.passport_scores(shipment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_tasks_shipment_status
  ON public.workflow_tasks(shipment_id, status);

CREATE INDEX IF NOT EXISTS idx_parties_shipment_role
  ON public.parties(shipment_id, role);

CREATE INDEX IF NOT EXISTS idx_products_category_id
  ON public.products(product_category_id);

-- ===== 20240820000016_freight_tracking.sql =====
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

-- ===== 20240820000017_user_language_preference.sql =====
-- User language preference for i18n

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'en'
    CHECK (preferred_language IN ('en', 'fr', 'pt', 'ar'));

CREATE INDEX IF NOT EXISTS idx_users_preferred_language
  ON public.users(preferred_language);

-- ===== 20240820000018_compliance_enhancements.sql =====
-- Party sanctions screening + user notification preferences

CREATE TABLE IF NOT EXISTS public.party_screenings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  screened_name TEXT NOT NULL,
  match_status TEXT NOT NULL CHECK (match_status IN ('clear', 'potential_match', 'confirmed_match')),
  match_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  list_source TEXT NOT NULL DEFAULT 'passport_watchlist',
  match_details JSONB NOT NULL DEFAULT '{}',
  screened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (party_id, list_source)
);

CREATE INDEX IF NOT EXISTS idx_party_screenings_shipment ON public.party_screenings(shipment_id);
CREATE INDEX IF NOT EXISTS idx_party_screenings_org ON public.party_screenings(organization_id);
CREATE INDEX IF NOT EXISTS idx_party_screenings_status ON public.party_screenings(match_status);

ALTER TABLE public.party_screenings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "party_screenings_select"
  ON public.party_screenings FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "party_screenings_insert"
  ON public.party_screenings FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "party_screenings_update"
  ON public.party_screenings FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id())
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "party_screenings_delete"
  ON public.party_screenings FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id());

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{
    "email_alerts": true,
    "tracking_updates": true,
    "compliance_alerts": true,
    "weekly_digest": false
  }'::jsonb;

-- ===== 20240820000019_data_governance.sql =====
-- Data governance: provenance lineage, trusted sources, trust metrics

CREATE TABLE IF NOT EXISTS public.trusted_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (
    source_type IN ('sanctions', 'tariff', 'regulatory', 'hs_reference', 'ai', 'human', 'system', 'tracking')
  ),
  authority TEXT,
  base_url TEXT,
  description TEXT,
  reliability_score NUMERIC(5,2) NOT NULL DEFAULT 80 CHECK (reliability_score >= 0 AND reliability_score <= 100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.trusted_sources (id, name, source_type, authority, base_url, description, reliability_score, metadata) VALUES
  ('opensanctions', 'OpenSanctions', 'sanctions', 'OpenSanctions.org', 'https://www.opensanctions.org/', 'Consolidated sanctions and PEP datasets', 92, '{"connector":"opensanctions"}'),
  ('ofac-sdn', 'OFAC SDN List', 'sanctions', 'US Treasury OFAC', 'https://sanctionssearch.ofac.treas.gov/', 'US Specially Designated Nationals list', 98, '{"connector":"static_watchlist"}'),
  ('un-sanctions', 'UN Security Council Sanctions', 'sanctions', 'United Nations', 'https://www.un.org/securitycouncil/sanctions/', 'UN consolidated sanctions lists', 97, '{"connector":"static_watchlist"}'),
  ('wco-hs', 'WCO Harmonized System', 'hs_reference', 'World Customs Organization', 'https://www.wcoomd.org/', 'International HS nomenclature reference', 99, '{"connector":"static_hs"}'),
  ('gra-ghana', 'Ghana Revenue Authority Customs', 'tariff', 'GRA Customs', 'https://gra.gov.gh/', 'Ghana import duty and tariff schedules', 95, '{"connector":"static_tariff"}'),
  ('unctad-trains', 'UNCTAD TRAINS', 'tariff', 'UNCTAD', 'https://trainsonline.unctad.org/', 'Trade analysis and tariff intelligence', 90, '{"connector":"static_tariff"}'),
  ('passport-regulations', 'Passport Regulation KB', 'regulatory', 'Passport Platform', NULL, 'Curated regulatory rules with source citations', 88, '{"connector":"internal"}'),
  ('openai', 'OpenAI', 'ai', 'OpenAI', 'https://openai.com/', 'Document classification and field extraction', 85, '{"connector":"openai"}'),
  ('passport-arbiter', 'Passport Arbiter', 'system', 'Passport Platform', NULL, 'Deterministic validation and normalization rules', 96, '{"connector":"internal"}'),
  ('human-analyst', 'Human Analyst', 'human', 'Organization User', NULL, 'Manual review and field confirmation', 99, '{"connector":"internal"}'),
  ('vesselfinder', 'VesselFinder', 'tracking', 'VesselFinder', 'https://www.vesselfinder.com/', 'Vessel and container tracking data', 82, '{"connector":"vesselfinder"}'),
  ('passport-watchlist', 'Passport High-Risk Watchlist', 'sanctions', 'Passport Platform', NULL, 'Curated high-risk entity patterns', 75, '{"connector":"static_watchlist"}')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.data_provenance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  field_path TEXT,
  value_snapshot JSONB,
  source_id TEXT NOT NULL REFERENCES public.trusted_sources(id),
  source_record_ref TEXT,
  confidence NUMERIC(5,4) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  transformation TEXT,
  recorded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_provenance_shipment ON public.data_provenance_events(shipment_id);
CREATE INDEX IF NOT EXISTS idx_provenance_org ON public.data_provenance_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_provenance_entity ON public.data_provenance_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_provenance_source ON public.data_provenance_events(source_id);

CREATE TABLE IF NOT EXISTS public.shipment_trust_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  trust_score NUMERIC(5,2) NOT NULL CHECK (trust_score >= 0 AND trust_score <= 100),
  data_quality_score NUMERIC(5,2) NOT NULL CHECK (data_quality_score >= 0 AND data_quality_score <= 100),
  lineage_completeness NUMERIC(5,2) NOT NULL DEFAULT 0,
  source_reliability_avg NUMERIC(5,2) NOT NULL DEFAULT 0,
  human_override_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
  metrics JSONB NOT NULL DEFAULT '{}',
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trust_snapshots_shipment ON public.shipment_trust_snapshots(shipment_id, calculated_at DESC);

ALTER TABLE public.ai_provider_logs
  ADD COLUMN IF NOT EXISTS extraction_id UUID REFERENCES public.document_extractions(id) ON DELETE SET NULL;

ALTER TABLE public.data_provenance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_trust_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trusted_sources_select"
  ON public.trusted_sources FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "provenance_select"
  ON public.data_provenance_events FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "provenance_insert"
  ON public.data_provenance_events FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "trust_snapshots_select"
  ON public.shipment_trust_snapshots FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "trust_snapshots_insert"
  ON public.shipment_trust_snapshots FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id());

-- ===== 20240820000020_additional_corridors.sql =====
-- Additional import corridors: Nigeria and Kenya

INSERT INTO public.jurisdictions (code, name)
VALUES
  ('NG', 'Nigeria'),
  ('KE', 'Kenya')
ON CONFLICT (code) DO NOTHING;

-- Nigeria import regulations (curated, source-backed templates)
INSERT INTO public.regulations (
  jurisdiction_id, product_category_id, title, description, rule_type,
  required_document_type, authority, source_url, source_text,
  effective_date, confidence
)
SELECT
  j.id, pc.id, r.title, r.description, r.rule_type,
  r.required_document_type, r.authority, r.source_url, r.source_text,
  r.effective_date::date, r.confidence
FROM public.jurisdictions j
CROSS JOIN (VALUES
  ('food', 'NAFDAC Registration Required', 'Food products imported into Nigeria require NAFDAC product registration.', 'registration_required', 'nafdac_registration', 'NAFDAC', 'https://nafdac.gov.ng/', 'Imported food products must be registered with NAFDAC before clearance.', '2024-01-01', 1.0),
  ('food', 'Health Certificate', 'Food imports require a health certificate from the exporting country.', 'document_required', 'health_certificate', 'NAFDAC', 'https://nafdac.gov.ng/', 'Health certificate required for food imports.', '2024-01-01', 0.9),
  ('pharmaceuticals', 'NAFDAC Drug Registration', 'Pharmaceutical products must be registered with NAFDAC before import.', 'registration_required', 'nafdac_registration', 'NAFDAC', 'https://nafdac.gov.ng/', 'All pharmaceutical products require NAFDAC registration.', '2024-01-01', 1.0),
  ('pharmaceuticals', 'Import Permit for Pharmaceuticals', 'Each pharmaceutical shipment requires an import permit.', 'permit_required', 'import_permit', 'NAFDAC', 'https://nafdac.gov.ng/', 'Import permit required per consignment of pharmaceutical products.', '2024-01-01', 1.0),
  ('electronics', 'SONCAP Certificate', 'Regulated products require Standards Organisation of Nigeria Conformity Assessment Programme certificate.', 'document_required', 'soncap_certificate', 'SON', 'https://son.gov.ng/', 'SONCAP certification required for regulated product categories.', '2024-01-01', 0.95),
  ('general_consumer_goods', 'Form M / Import Documentation', 'Commercial imports require Form M and valid import documentation.', 'document_required', 'import_declaration', 'CBN / NCS', 'https://www.customs.gov.ng/', 'Form M and supporting import documents required for commercial imports.', '2024-01-01', 1.0),
  ('general_consumer_goods', 'Bill of Lading', 'All sea freight imports require a bill of lading.', 'document_required', 'bill_of_lading', 'Nigeria Customs Service', 'https://www.customs.gov.ng/', 'Bill of lading required for customs clearance.', '2024-01-01', 1.0),
  ('general_consumer_goods', 'HS Code Classification', 'All imported goods must carry correct HS classification.', 'registration_required', 'hs_code', 'Nigeria Customs Service', 'https://www.customs.gov.ng/', 'Correct HS code classification required for duty assessment.', '2024-01-01', 1.0),
  ('agricultural_products', 'Phytosanitary Certificate', 'Plant and agricultural imports require phytosanitary certification.', 'document_required', 'phytosanitary_certificate', 'Nigeria Agricultural Quarantine Service', 'https://naqs.gov.ng/', 'Phytosanitary certificate required for agricultural imports.', '2024-01-01', 0.95),
  ('chemicals', 'NAFDAC / Environmental Clearance', 'Chemical imports may require NAFDAC or environmental clearance.', 'permit_required', 'chemical_import_permit', 'NAFDAC', 'https://nafdac.gov.ng/', 'Chemical imports subject to regulatory clearance.', '2024-01-01', 0.9)
) AS r(category_code, title, description, rule_type, required_document_type, authority, source_url, source_text, effective_date, confidence)
JOIN public.product_categories pc ON pc.code = r.category_code
WHERE j.code = 'NG';

-- Kenya import regulations (curated, source-backed templates)
INSERT INTO public.regulations (
  jurisdiction_id, product_category_id, title, description, rule_type,
  required_document_type, authority, source_url, source_text,
  effective_date, confidence
)
SELECT
  j.id, pc.id, r.title, r.description, r.rule_type,
  r.required_document_type, r.authority, r.source_url, r.source_text,
  r.effective_date::date, r.confidence
FROM public.jurisdictions j
CROSS JOIN (VALUES
  ('food', 'KEBS Food Import Standards', 'Food imports must comply with Kenya Bureau of Standards requirements.', 'document_required', 'kebs_certificate', 'KEBS', 'https://kebs.org/', 'Food products must meet KEBS standards and certification requirements.', '2024-01-01', 0.95),
  ('pharmaceuticals', 'PPB Product Registration', 'Pharmaceutical products must be registered with the Pharmacy and Poisons Board.', 'registration_required', 'ppb_registration', 'Pharmacy and Poisons Board', 'https://ppb.go.ke/', 'All pharmaceutical products require PPB registration before import.', '2024-01-01', 1.0),
  ('pharmaceuticals', 'Import Permit for Medicines', 'Medicine imports require an import permit from PPB.', 'permit_required', 'import_permit', 'Pharmacy and Poisons Board', 'https://ppb.go.ke/', 'Import permit required for each medicine consignment.', '2024-01-01', 1.0),
  ('electronics', 'KEBS PVoC Certificate', 'Regulated goods require Pre-Export Verification of Conformity certificate.', 'document_required', 'pvoc_certificate', 'KEBS', 'https://kebs.org/', 'PVoC certificate required for regulated product categories.', '2024-01-01', 0.95),
  ('general_consumer_goods', 'Customs Entry Documentation', 'Commercial imports require customs entry and IDF documentation.', 'document_required', 'import_declaration', 'Kenya Revenue Authority', 'https://www.kra.go.ke/', 'Import declaration and customs entry documents required.', '2024-01-01', 1.0),
  ('general_consumer_goods', 'Bill of Lading or Air Waybill', 'All commercial imports require transport documentation.', 'document_required', 'bill_of_lading', 'Kenya Revenue Authority', 'https://www.kra.go.ke/', 'Bill of lading or air waybill required for clearance.', '2024-01-01', 1.0),
  ('general_consumer_goods', 'HS Code Classification', 'All imported goods must be classified with the correct HS code.', 'registration_required', 'hs_code', 'Kenya Revenue Authority', 'https://www.kra.go.ke/', 'Correct HS classification required for duty assessment.', '2024-01-01', 1.0),
  ('agricultural_products', 'Phytosanitary Certificate', 'Plant products require phytosanitary certification.', 'document_required', 'phytosanitary_certificate', 'Kenya Plant Health Inspectorate Service', 'https://www.kephis.org/', 'Phytosanitary certificate required for plant and agricultural imports.', '2024-01-01', 0.95),
  ('cosmetics', 'KEBS / PPB Registration', 'Cosmetic products may require KEBS or PPB registration depending on classification.', 'registration_required', 'product_registration', 'KEBS', 'https://kebs.org/', 'Cosmetic and personal care products subject to registration requirements.', '2024-01-01', 0.9)
) AS r(category_code, title, description, rule_type, required_document_type, authority, source_url, source_text, effective_date, confidence)
JOIN public.product_categories pc ON pc.code = r.category_code
WHERE j.code = 'KE';

-- ===== 20240820000021_billing.sql =====
-- Organization billing (Stripe-ready)

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'active'
    CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled')),
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS billing_email TEXT,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer
  ON public.organizations(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- ===== 20240820000022_external_collaborator_invites.sql =====
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

-- ===== 20240820000023_protect_platform_admin_flag.sql =====
-- Prevent authenticated users from self-granting platform admin via profile updates.

CREATE OR REPLACE FUNCTION public.guard_platform_admin_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_platform_admin IS DISTINCT FROM OLD.is_platform_admin THEN
    IF auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION 'Platform admin status cannot be changed through the app';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_guard_platform_admin ON public.users;
CREATE TRIGGER users_guard_platform_admin
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_platform_admin_column();

