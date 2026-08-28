import { z } from "zod";
import { DOCUMENT_TYPES, PARTY_ROLES } from "@/lib/constants";

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(1, "Full name is required"),
});

export const createShipmentSchema = z.object({
  shipment_ref: z.string().min(1, "Reference is required").max(50),
  origin_country: z.string().max(100).optional(),
  destination_country: z.string().max(100).optional(),
});

export const createPartySchema = z.object({
  shipment_id: z.string().uuid(),
  role: z.enum(PARTY_ROLES),
  name: z.string().min(1, "Name is required").max(200),
  country: z.string().max(100).optional().nullable(),
});

export const createProductSchema = z.object({
  shipment_id: z.string().uuid(),
  name: z.string().min(1, "Name is required").max(200),
  hs_code: z.string().max(20).optional().nullable(),
  quantity: z.coerce.number().positive().optional().nullable(),
  currency: z.string().length(3).default("USD"),
});

export const uploadDocumentSchema = z.object({
  doc_type: z.enum(DOCUMENT_TYPES),
});

export function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function formatAction(action: string): string {
  return action.replace(/\./g, " · ").replace(/_/g, " ");
}
