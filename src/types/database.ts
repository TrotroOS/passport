export type UserRole = "owner" | "admin" | "member";

export type ShipmentStatus =
  | "draft"
  | "documents_uploaded"
  | "in_review"
  | "ready"
  | "blocked"
  | "archived";

export type ClearanceStage =
  | "pending"
  | "classifying"
  | "review_required"
  | "cleared_assistive"
  | "blocked";

export type PartyRole =
  | "seller"
  | "buyer"
  | "manufacturer"
  | "freight_forwarder"
  | "customs_broker"
  | "warehouse"
  | "trucker"
  | "insurer";

export type IngestionSource = "manual" | "email" | "whatsapp";

export type InboundChannelType = "email" | "whatsapp";

export type DocumentType =
  | "invoice"
  | "packing_list"
  | "bill_of_lading"
  | "certificate"
  | "import_declaration"
  | "other";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  subscription_tier?: "free" | "pro" | "enterprise";
  subscription_status?: "active" | "trialing" | "past_due" | "canceled";
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  billing_email?: string | null;
  trial_ends_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  organization_id: string | null;
  role: UserRole;
  is_platform_admin: boolean;
  preferred_language: string;
  notification_preferences?: NotificationPreferences;
  created_at: string;
  updated_at: string;
}

export interface Shipment {
  id: string;
  organization_id: string;
  shipment_ref: string;
  origin_country: string | null;
  destination_country: string | null;
  incoterm: string | null;
  owner_confirmed_ready: boolean;
  broker_confirmed_ready: boolean;
  status: ShipmentStatus;
  clearance_stage: ClearanceStage | null;
  clearance_autopilot_at: string | null;
  clearance_summary: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type CollaboratorRole = "viewer" | "commenter" | "editor";
export type CollaboratorStatus = "pending" | "active" | "revoked" | "declined";
export type CollaboratorParticipantType =
  | "customs_broker"
  | "freight_forwarder"
  | "collaborator";

export interface ShipmentCollaborator {
  id: string;
  shipment_id: string;
  organization_id: string | null;
  user_id: string | null;
  invitee_email: string | null;
  role: CollaboratorRole;
  participant_type: CollaboratorParticipantType;
  status: CollaboratorStatus;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
  users?: { id: string; email: string; full_name: string | null } | null;
  organizations?: { id: string; name: string } | null;
  inviter?: { email: string; full_name: string | null } | null;
}

export interface ShipmentComment {
  id: string;
  shipment_id: string;
  user_id: string;
  organization_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  users?: { id: string; email: string; full_name: string | null } | null;
  organizations?: { id: string; name: string } | null;
}

export interface Party {
  id: string;
  shipment_id: string;
  role: PartyRole;
  name: string;
  country: string | null;
  email: string | null;
  phone: string | null;
  tin: string | null;
  created_at: string;
}

export type ScreeningMatchStatus = "clear" | "potential_match" | "confirmed_match";

export interface PartyScreening {
  id: string;
  shipment_id: string;
  party_id: string;
  organization_id: string;
  screened_name: string;
  match_status: ScreeningMatchStatus;
  match_score: number;
  list_source: string;
  match_details: Record<string, unknown>;
  screened_at: string;
  created_at: string;
}

export interface NotificationPreferences {
  email_alerts: boolean;
  tracking_updates: boolean;
  compliance_alerts: boolean;
  weekly_digest: boolean;
}

export type TrustedSourceType =
  | "sanctions"
  | "tariff"
  | "regulatory"
  | "hs_reference"
  | "ai"
  | "human"
  | "system"
  | "tracking";

export interface TrustedSource {
  id: string;
  name: string;
  source_type: TrustedSourceType;
  authority: string | null;
  base_url: string | null;
  description: string | null;
  reliability_score: number;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DataProvenanceEvent {
  id: string;
  organization_id: string;
  shipment_id: string | null;
  entity_type: string;
  entity_id: string;
  field_path: string | null;
  value_snapshot: unknown;
  source_id: string;
  source_record_ref: string | null;
  confidence: number | null;
  transformation: string | null;
  recorded_by: string | null;
  recorded_at: string;
  metadata: Record<string, unknown>;
}

export interface ShipmentTrustSnapshot {
  id: string;
  shipment_id: string;
  organization_id: string;
  trust_score: number;
  data_quality_score: number;
  lineage_completeness: number;
  source_reliability_avg: number;
  human_override_rate: number;
  metrics: Record<string, unknown>;
  calculated_at: string;
}

export type HsCodeStatus =
  | "not_verified"
  | "missing"
  | "suggested"
  | "verified"
  | "conflict";

export interface Product {
  id: string;
  shipment_id: string;
  name: string;
  description: string | null;
  hs_code: string | null;
  hs_code_status: HsCodeStatus;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  currency: string;
  total_value: number | null;
  country_of_origin: string | null;
  product_category_id: string | null;
  created_at: string;
}

export interface HsCodeSuggestion {
  id: string;
  product_id: string;
  shipment_id: string;
  organization_id: string;
  hs_code: string;
  description_match: string | null;
  confidence: number | null;
  source: "ai" | "user" | "broker" | "system";
  is_selected: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface HsCodeVerificationCheck {
  id: string;
  product_id: string;
  shipment_id: string;
  check_type:
    | "missing_hs_code"
    | "invalid_format"
    | "description_mismatch"
    | "requires_review";
  status: "passed" | "failed" | "warning" | "needs_review";
  details: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type ProcessingStatus =
  | "pending"
  | "processing"
  | "processed"
  | "failed"
  | "needs_review";

export interface Document {
  id: string;
  shipment_id: string;
  organization_id: string;
  doc_type: DocumentType;
  file_path: string;
  file_name: string | null;
  mime_type: string | null;
  uploaded_by: string | null;
  processing_status: ProcessingStatus;
  doc_type_ai: string | null;
  doc_type_confidence: number | null;
  detected_abbreviation: string | null;
  processing_error: string | null;
  uploaded_by_collaborator: boolean;
  ingestion_source: IngestionSource | null;
  inbound_message_id: string | null;
  created_at: string;
}

export interface DocumentAbbreviationRow {
  id: string;
  abbreviation: string;
  canonical_doc_type: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IncotermRow {
  code: string;
  name: string;
  description: string | null;
  risk_transfer_point: string | null;
  created_at: string;
}

export interface DocumentExtraction {
  id: string;
  document_id: string;
  extraction_type: string;
  extracted_data: Record<string, unknown>;
  confidence: number | null;
  is_arbiter_approved: boolean;
  needs_human_review: boolean;
  created_at: string;
  updated_at: string;
}

export interface AIProviderLog {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  document_id: string | null;
  provider: string;
  model: string;
  prompt_version: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost: number | null;
  latency_ms: number | null;
  status: "success" | "error" | "rate_limited";
  error_message: string | null;
  created_at: string;
}

export interface ArbiterEvent {
  id: string;
  document_id: string;
  rule_id: string;
  rule_description: string | null;
  passed: boolean;
  severity: "info" | "warning" | "error";
  details: Record<string, unknown>;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  organization_id: string;
  user_id: string | null;
  shipment_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type VerificationSeverity = "info" | "warning" | "critical";
export type VerificationCheckStatus = "passed" | "failed" | "warning" | "needs_review";
export type DiscrepancyStatus = "open" | "resolved" | "ignored";

export interface VerificationCheck {
  id: string;
  shipment_id: string;
  check_id: string;
  check_type: string;
  severity: VerificationSeverity;
  status: VerificationCheckStatus;
  details: Record<string, unknown>;
  document_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface Discrepancy {
  id: string;
  shipment_id: string;
  verification_check_id: string | null;
  discrepancy_type: string;
  severity: VerificationSeverity;
  description: string;
  values: Record<string, unknown>;
  status: DiscrepancyStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PassportScore {
  id: string;
  shipment_id: string;
  overall_score: number;
  documentation_score: number | null;
  consistency_score: number | null;
  counterparty_score: number | null;
  regulatory_score: number | null;
  score_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Jurisdiction {
  id: string;
  code: string;
  name: string;
  created_at: string;
}

export interface ProductCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  created_at: string;
}

export type RegulationRuleType =
  | "document_required"
  | "permit_required"
  | "inspection_required"
  | "registration_required"
  | "restriction";

export interface Regulation {
  id: string;
  jurisdiction_id: string | null;
  product_category_id: string | null;
  title: string;
  description: string | null;
  rule_type: RegulationRuleType;
  required_document_type: string | null;
  authority: string | null;
  source_url: string | null;
  source_text: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  confidence: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type RegulatoryCheckStatus =
  | "passed"
  | "failed"
  | "needs_review"
  | "not_applicable";

export interface RegulatoryCheck {
  id: string;
  shipment_id: string;
  regulation_id: string | null;
  check_type: string;
  status: RegulatoryCheckStatus;
  severity: VerificationSeverity;
  details: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type WorkflowTaskType =
  | "obtain_document"
  | "resolve_discrepancy"
  | "verify_permit"
  | "contact_authority"
  | "provide_info"
  | "verify_hs_code"
  | "other";

export type WorkflowTaskStatus =
  | "open"
  | "in_progress"
  | "done"
  | "blocked"
  | "not_applicable";

export type WorkflowTaskPriority = "low" | "medium" | "high" | "urgent";

export interface WorkflowTask {
  id: string;
  shipment_id: string;
  title: string;
  description: string | null;
  task_type: WorkflowTaskType;
  priority: WorkflowTaskPriority;
  status: WorkflowTaskStatus;
  assigned_to: string | null;
  due_date: string | null;
  related_document_id: string | null;
  related_regulation_id: string | null;
  created_at: string;
  updated_at: string;
}

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type RiskFactorType =
  | "counterparty_risk"
  | "documentation_risk"
  | "regulatory_risk"
  | "classification_risk"
  | "route_risk"
  | "historical_risk";

export interface RiskFactor {
  id: string;
  shipment_id: string;
  factor_type: RiskFactorType;
  score: number;
  weight: number;
  details: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RiskAssessment {
  id: string;
  shipment_id: string;
  overall_risk_score: number;
  risk_level: RiskLevel;
  breakdown: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  organization_id: string;
  name: string;
  key_hash: string;
  prefix: string;
  scopes: string[];
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookSubscription {
  id: string;
  organization_id: string;
  url: string;
  events: string[];
  secret: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: "success" | "failed" | "retrying";
  response_code: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface InboundChannel {
  id: string;
  organization_id: string;
  channel_type: InboundChannelType;
  channel_address: string;
  is_active: boolean;
  created_at: string;
}

export interface InboundMessage {
  id: string;
  organization_id: string;
  user_id: string | null;
  shipment_id: string | null;
  channel_type: InboundChannelType;
  sender_address: string;
  subject: string | null;
  body_text: string | null;
  received_at: string;
  processed: boolean;
  processed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface InboundAttachment {
  id: string;
  inbound_message_id: string;
  file_name: string | null;
  mime_type: string | null;
  file_path: string;
  size_bytes: number | null;
  created_at: string;
}

export interface ShipmentReference {
  id: string;
  organization_id: string;
  shipment_id: string;
  reference_text: string;
  created_at: string;
}

export type FeedbackType = "bug" | "feature" | "suggestion" | "other";
export type FeedbackStatus = "open" | "acknowledged" | "closed";

export interface Feedback {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  type: FeedbackType;
  message: string;
  status: FeedbackStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export type ErrorLogSeverity = "error" | "warning" | "info";

export interface ErrorLog {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  route: string | null;
  method: string | null;
  error_message: string;
  stack_trace: string | null;
  severity: ErrorLogSeverity;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface RegulatoryCheckWithRegulation extends RegulatoryCheck {
  regulations?: Regulation | null;
}

export interface ShipmentDetail extends Shipment {
  parties: Party[];
  products: Product[];
  documents: Document[];
}

export type TrackingEventType =
  | "vessel_departed"
  | "vessel_arrived"
  | "container_discharged"
  | "customs_clearance"
  | "delivery"
  | "delay"
  | "other";

export interface ContainerDetail {
  id: string;
  shipment_id: string;
  container_number: string;
  container_type: string | null;
  seal_number: string | null;
  carrier: string | null;
  carrier_scac: string | null;
  vessel_name: string | null;
  voyage_number: string | null;
  bill_of_lading_number: string | null;
  tracking_provider: string | null;
  provider_container_id: string | null;
  provider_tracking_request_id: string | null;
  provider_last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShipmentTrackingEvent {
  id: string;
  shipment_id: string;
  container_number: string | null;
  event_type: TrackingEventType;
  event_date: string | null;
  location: string | null;
  description: string | null;
  source: string | null;
  raw_data: Record<string, unknown>;
  created_at: string;
}

export interface TrackingProviderConfig {
  id: string;
  name: string;
  api_key: string | null;
  api_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization;
        Insert: Omit<Organization, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Organization>;
        Relationships: [];
      };
      users: {
        Row: User;
        Insert: Omit<User, "created_at" | "updated_at" | "role"> & {
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<User>;
        Relationships: [];
      };
      shipments: {
        Row: Shipment;
        Insert: Omit<Shipment, "id" | "created_at" | "updated_at" | "status"> & {
          id?: string;
          status?: ShipmentStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Shipment>;
        Relationships: [];
      };
      parties: {
        Row: Party;
        Insert: Omit<Party, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Party>;
        Relationships: [];
      };
      products: {
        Row: Product;
        Insert: Omit<Product, "id" | "created_at" | "currency"> & {
          id?: string;
          currency?: string;
          created_at?: string;
        };
        Update: Partial<Product>;
        Relationships: [];
      };
      documents: {
        Row: Document;
        Insert: Omit<Document, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Document>;
        Relationships: [];
      };
      audit_events: {
        Row: AuditEvent;
        Insert: Omit<AuditEvent, "id" | "created_at" | "metadata"> & {
          id?: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: Partial<AuditEvent>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
