import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "@/lib/utils";

export interface AttachmentValidation {
  valid: boolean;
  error?: string;
}

export function validateInboundAttachment(
  mimeType: string,
  sizeBytes: number
): AttachmentValidation {
  if (sizeBytes <= 0) {
    return { valid: false, error: "Empty file" };
  }
  if (sizeBytes > MAX_FILE_SIZE) {
    return { valid: false, error: "File exceeds 20MB limit" };
  }

  const normalized = mimeType.toLowerCase().split(";")[0].trim();
  const allowed = ALLOWED_MIME_TYPES as readonly string[];
  if (!allowed.includes(normalized)) {
    return {
      valid: false,
      error: `Unsupported file type: ${normalized}`,
    };
  }

  return { valid: true };
}

export function guessMimeType(fileName: string, fallback?: string): string {
  if (fallback && fallback !== "application/octet-stream") {
    return fallback.split(";")[0].trim().toLowerCase();
  }
  const ext = fileName.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    csv: "text/csv",
  };
  return map[ext ?? ""] ?? "application/octet-stream";
}
