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
