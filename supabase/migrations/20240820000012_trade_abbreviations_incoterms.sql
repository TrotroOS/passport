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
