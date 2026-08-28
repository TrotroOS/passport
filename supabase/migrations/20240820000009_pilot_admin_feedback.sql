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
