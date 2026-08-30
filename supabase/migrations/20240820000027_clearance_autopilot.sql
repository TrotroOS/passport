-- Customs clearance autopilot: persisted classification outcome per shipment

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS clearance_stage TEXT CHECK (
    clearance_stage IN (
      'pending',
      'classifying',
      'review_required',
      'cleared_assistive',
      'blocked'
    )
  ),
  ADD COLUMN IF NOT EXISTS clearance_autopilot_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS clearance_summary JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_shipments_clearance_stage
  ON public.shipments (clearance_stage)
  WHERE clearance_stage IS NOT NULL;

COMMENT ON COLUMN public.shipments.clearance_stage IS
  'Assistive customs clearance classification — not government clearance approval.';
COMMENT ON COLUMN public.shipments.clearance_summary IS
  'Latest autopilot run: scores, reasons, counts (JSON).';
