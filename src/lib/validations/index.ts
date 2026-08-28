import { z } from "zod";
import { isValidApiScope } from "@/lib/api/api-key-scopes";
import {
  ALLOWED_MIME_TYPES,
  DOCUMENT_TYPES,
  MAX_FILE_SIZE,
  PARTY_ROLES,
  SHIPMENT_STATUSES,
} from "@/lib/utils";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(1, "Full name is required").max(100),
  acceptTerms: z
    .union([z.literal("on"), z.literal("true"), z.literal(true)])
    .optional(),
});

export const signupServerSchema = signupSchema.refine(
  (data) => data.acceptTerms === "on" || data.acceptTerms === "true" || data.acceptTerms === true,
  {
    message: "You must accept the Terms of Service and Privacy Policy",
    path: ["acceptTerms"],
  }
);

export const createShipmentSchema = z.object({
  shipment_ref: z.string().min(1, "Reference is required").max(50),
  origin_country: z.string().max(100).optional().nullable(),
  destination_country: z.string().max(100).optional().nullable(),
});

export const updateShipmentSchema = z.object({
  shipment_ref: z.string().min(1).max(50).optional(),
  origin_country: z.string().max(100).optional().nullable(),
  destination_country: z.string().max(100).optional().nullable(),
  status: z.enum(SHIPMENT_STATUSES).optional(),
});

export const createPartySchema = z.object({
  shipment_id: z.string().uuid(),
  role: z.enum(PARTY_ROLES),
  name: z.string().min(1, "Name is required").max(200),
  country: z.string().max(100).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().max(50).optional().nullable(),
  tin: z.string().max(50).optional().nullable(),
});

export const createProductSchema = z.object({
  shipment_id: z.string().uuid(),
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(1000).optional().nullable(),
  hs_code: z.string().max(20).optional().nullable(),
  quantity: z.coerce.number().positive().optional().nullable(),
  unit: z.string().max(50).optional().nullable(),
  unit_price: z.coerce.number().nonnegative().optional().nullable(),
  currency: z.string().length(3),
  total_value: z.coerce.number().nonnegative().optional().nullable(),
  country_of_origin: z.string().max(100).optional().nullable(),
  product_category_id: z.string().uuid().optional().nullable(),
});

export const uploadDocumentSchema = z.object({
  doc_type: z.enum(DOCUMENT_TYPES),
});

export const documentFileSchema = z
  .instanceof(File)
  .refine((file) => file.size <= MAX_FILE_SIZE, "File must be 20MB or less")
  .refine(
    (file) =>
      ALLOWED_MIME_TYPES.includes(
        file.type as (typeof ALLOWED_MIME_TYPES)[number]
      ),
    "File type not allowed"
  );

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;
export type UpdateShipmentInput = z.infer<typeof updateShipmentSchema>;
export type CreatePartyInput = z.infer<typeof createPartySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const confirmExtractionSchema = z.object({
  extraction_id: z.string().uuid(),
  confirmed_data: z.record(z.unknown()),
  doc_type: z.enum(DOCUMENT_TYPES).optional(),
});

export type ConfirmExtractionInput = z.infer<typeof confirmExtractionSchema>;

export const discrepancyActionSchema = z.object({
  resolution_note: z.string().max(500).optional(),
});

export type DiscrepancyActionInput = z.infer<typeof discrepancyActionSchema>;

export const workflowTaskStatusSchema = z.object({
  status: z.enum([
    "open",
    "in_progress",
    "done",
    "blocked",
    "not_applicable",
  ]),
});

export type WorkflowTaskStatusInput = z.infer<typeof workflowTaskStatusSchema>;

export const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  scopes: z
    .array(z.string())
    .optional()
    .refine(
      (scopes) => !scopes || scopes.every((scope) => isValidApiScope(scope)),
      "One or more scopes are invalid"
    ),
});

export const createWebhookSchema = z.object({
  url: z.string().url("Valid URL required"),
  events: z.array(z.string()).min(1),
});

export const submitFeedbackSchema = z.object({
  type: z.enum(["bug", "feature", "suggestion", "other"]),
  message: z.string().min(1, "Message is required").max(2000),
});

export const updateFeedbackSchema = z.object({
  status: z.enum(["open", "acknowledged", "closed"]).optional(),
  admin_notes: z.string().max(2000).optional().nullable(),
});

const canonicalDocTypes = [
  "invoice",
  "packing_list",
  "bill_of_lading",
  "certificate",
  "import_declaration",
  "other",
] as const;

export const createDocumentAbbreviationSchema = z.object({
  abbreviation: z.string().min(1).max(20).transform((v) => v.toUpperCase()),
  canonical_doc_type: z.enum(canonicalDocTypes),
  description: z.string().max(500).optional().nullable(),
  is_active: z.boolean().optional(),
});

export const updateDocumentAbbreviationSchema = z.object({
  abbreviation: z.string().min(1).max(20).transform((v) => v.toUpperCase()).optional(),
  canonical_doc_type: z.enum(canonicalDocTypes).optional(),
  description: z.string().max(500).optional().nullable(),
  is_active: z.boolean().optional(),
});

export const inviteCollaboratorSchema = z.object({
  email: z.string().email("Valid email required"),
  role: z.enum(["viewer", "commenter", "editor"]).default("viewer"),
});

export const createShipmentCommentSchema = z.object({
  body: z.string().min(1, "Comment is required").max(5000),
});

export const confirmReadySchema = z.object({
  type: z.enum(["owner", "broker"]),
});

export const analyticsDateRangeSchema = z.enum(["30d", "90d", "1y", "all"]);

const regulationRuleTypes = [
  "document_required",
  "permit_required",
  "inspection_required",
  "registration_required",
  "restriction",
] as const;

export const createRegulationSchema = z.object({
  jurisdiction_id: z.string().uuid().optional().nullable(),
  product_category_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  rule_type: z.enum(regulationRuleTypes),
  required_document_type: z.string().max(100).optional().nullable(),
  authority: z.string().max(200).optional().nullable(),
  source_url: z.string().url().optional().nullable().or(z.literal("")),
  source_text: z.string().max(1000).optional().nullable(),
  effective_date: z.string().optional().nullable(),
  expiry_date: z.string().optional().nullable(),
  confidence: z.coerce.number().min(0).max(1).optional(),
  is_active: z.boolean().optional(),
});

export const updateRegulationSchema = createRegulationSchema.partial();

export const updateUserPreferencesSchema = z.object({
  preferred_language: z.enum(["en", "fr", "pt", "ar"]),
});

export const updateUserProfileSchema = z.object({
  full_name: z.string().min(1, "Name is required").max(200).optional(),
  phone: z.string().max(50).optional().nullable(),
  preferred_language: z.enum(["en", "fr", "pt", "ar"]).optional(),
});

export const updateNotificationPreferencesSchema = z.object({
  email_alerts: z.boolean().optional(),
  tracking_updates: z.boolean().optional(),
  compliance_alerts: z.boolean().optional(),
  weekly_digest: z.boolean().optional(),
});

export const updatePhoneSchema = z.object({
  phone: z.string().nullable(),
});

export const addContainerSchema = z.object({
  container_number: z
    .string()
    .min(4, "Container number is required")
    .max(20)
    .transform((v) => v.trim().toUpperCase()),
  container_type: z.string().max(50).optional().nullable(),
  seal_number: z.string().max(50).optional().nullable(),
  carrier: z.string().max(100).optional().nullable(),
  vessel_name: z.string().max(200).optional().nullable(),
  voyage_number: z.string().max(50).optional().nullable(),
  bill_of_lading_number: z.string().max(100).optional().nullable(),
});

export const trackingWebhookSchema = z.object({
  shipment_id: z.string().uuid(),
  container_number: z.string().min(4).max(20),
  events: z
    .array(
      z.object({
        event_type: z.enum([
          "vessel_departed",
          "vessel_arrived",
          "container_discharged",
          "customs_clearance",
          "delivery",
          "delay",
          "other",
        ]),
        event_date: z.string(),
        location: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
      })
    )
    .min(1),
  source: z.string().max(100).optional(),
});
