export type ShipmentStatus =
  | "draft"
  | "documents_uploaded"
  | "in_review"
  | "ready"
  | "blocked"
  | "archived";

export interface Shipment {
  id: string;
  organization_id: string;
  shipment_ref: string;
  origin_country: string | null;
  destination_country: string | null;
  incoterm?: string | null;
  status: ShipmentStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  organization_id: string | null;
  role: string;
  created_at?: string;
  is_platform_admin?: boolean;
  organizations?: { name: string } | null;
}

export interface Document {
  id: string;
  shipment_id: string;
  organization_id: string;
  doc_type: string;
  file_path: string;
  mime_type: string | null;
  processing_status: string;
  processing_error?: string | null;
  created_at: string;
}

export interface Party {
  id: string;
  shipment_id: string;
  role: string;
  name: string;
  country: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface Product {
  id: string;
  shipment_id: string;
  name: string;
  hs_code: string | null;
  quantity: number | null;
  currency?: string;
  total_value?: number | null;
}

export interface PassportScore {
  id: string;
  shipment_id: string;
  overall_score: number;
  documentation_score: number | null;
  consistency_score: number | null;
  counterparty_score: number | null;
  regulatory_score: number | null;
  created_at: string;
}

export interface VerificationCheck {
  id: string;
  shipment_id: string;
  check_type: string;
  severity: string;
  status: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface Discrepancy {
  id: string;
  shipment_id: string;
  discrepancy_type: string;
  severity: string;
  description: string;
  status: string;
  created_at: string;
}

export interface WorkflowTask {
  id: string;
  shipment_id: string;
  title: string;
  status: string;
  due_date: string | null;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  organization_id: string;
  shipment_id: string | null;
  action: string;
  entity_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}
