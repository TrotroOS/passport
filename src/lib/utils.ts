import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function organizationNameFromEmail(email: string, fullName?: string): string {
  const domain = email.split("@")[1];
  if (domain && !["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com"].includes(domain)) {
    const company = domain.split(".")[0];
    return company.charAt(0).toUpperCase() + company.slice(1);
  }
  if (fullName?.trim()) {
    return `${fullName.trim()}'s Organization`;
  }
  const local = email.split("@")[0];
  return `${local.charAt(0).toUpperCase() + local.slice(1)}'s Organization`;
}

export function uniqueSlug(base: string): string {
  const slug = slugify(base);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${slug}-${suffix}`;
}

export const PROCESSING_STATUSES = [
  "pending",
  "processing",
  "processed",
  "failed",
  "needs_review",
] as const;

export function formatProcessingStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function processingStatusVariant(status: string) {
  switch (status) {
    case "processed":
      return "success" as const;
    case "failed":
      return "destructive" as const;
    case "needs_review":
      return "warning" as const;
    case "processing":
      return "default" as const;
    default:
      return "secondary" as const;
  }
}

export const SHIPMENT_STATUSES = [
  "draft",
  "documents_uploaded",
  "in_review",
  "ready",
  "blocked",
  "archived",
] as const;

export const PARTY_ROLES = [
  "seller",
  "buyer",
  "manufacturer",
  "freight_forwarder",
  "customs_broker",
  "warehouse",
  "trucker",
  "insurer",
] as const;

export const DOCUMENT_TYPES = [
  "invoice",
  "packing_list",
  "bill_of_lading",
  "certificate",
  "import_declaration",
  "other",
] as const;

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "application/csv",
] as const;

export const MAX_FILE_SIZE = 20 * 1024 * 1024;

export function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}
