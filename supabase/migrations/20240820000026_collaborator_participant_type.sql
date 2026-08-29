-- Distinguish customs brokers, forwarders, and other collaborators on shared shipments.

ALTER TABLE public.shipment_collaborators
  ADD COLUMN IF NOT EXISTS participant_type TEXT NOT NULL DEFAULT 'collaborator'
  CHECK (participant_type IN ('customs_broker', 'freight_forwarder', 'collaborator'));

CREATE INDEX IF NOT EXISTS idx_shipment_collaborators_participant_type
  ON public.shipment_collaborators(shipment_id, participant_type)
  WHERE status IN ('pending', 'active');
