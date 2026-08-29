-- Passport: apply migrations 020–023 only (current production gap)
-- Paste in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/kdufhywygwbnerrlfnok/sql/new

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
