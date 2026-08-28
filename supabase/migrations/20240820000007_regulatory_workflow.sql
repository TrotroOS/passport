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
