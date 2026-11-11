-- One-round dashboard KPI attach for a page of shipments.
-- Invoker + service_role: dashboard enrich uses the admin client.
CREATE OR REPLACE FUNCTION public.dashboard_shipment_summaries(p_ids uuid[])
RETURNS TABLE (
  shipment_id uuid,
  document_count bigint,
  overall_score numeric,
  open_discrepancies bigint,
  pending_tasks bigint,
  risk_level text
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    s.id,
    (SELECT count(*) FROM public.documents d WHERE d.shipment_id = s.id),
    (
      SELECT ps.overall_score
      FROM public.passport_scores ps
      WHERE ps.shipment_id = s.id
      ORDER BY ps.created_at DESC
      LIMIT 1
    ),
    (
      SELECT count(*)
      FROM public.discrepancies x
      WHERE x.shipment_id = s.id AND x.status = 'open'
    ),
    (
      SELECT count(*)
      FROM public.workflow_tasks w
      WHERE w.shipment_id = s.id
        AND w.status IN ('open', 'in_progress', 'blocked')
    ),
    (
      SELECT r.risk_level
      FROM public.risk_assessments r
      WHERE r.shipment_id = s.id
      ORDER BY r.created_at DESC
      LIMIT 1
    )
  FROM unnest(p_ids) AS s(id);
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_shipment_summaries(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_shipment_summaries(uuid[]) TO service_role;
