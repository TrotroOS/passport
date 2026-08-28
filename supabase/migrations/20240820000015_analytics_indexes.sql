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
