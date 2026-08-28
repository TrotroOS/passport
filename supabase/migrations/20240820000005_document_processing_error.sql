-- Add processing_error column for failed document visibility

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS processing_error TEXT;
