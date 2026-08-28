import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "@/lib/utils";

const ALLOWED_MIMES = ALLOWED_MIME_TYPES as readonly string[];

export interface UploadValidationSuccess {
  ok: true;
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

export interface UploadValidationFailure {
  ok: false;
  error: string;
}

export type UploadValidationResult = UploadValidationSuccess | UploadValidationFailure;

const MAX_FILE_NAME_LENGTH = 255;

/** Reject path traversal and unsafe characters in original upload names. */
export function sanitizeUploadFileName(fileName: string): string | null {
  const trimmed = fileName.trim();
  if (!trimmed || trimmed.length > MAX_FILE_NAME_LENGTH) {
    return null;
  }
  if (
    trimmed.includes("..") ||
    trimmed.includes("/") ||
    trimmed.includes("\\") ||
    trimmed.includes("\0")
  ) {
    return null;
  }
  const safe = trimmed.replace(/[^a-zA-Z0-9._-]/g, "_");
  return safe || null;
}

function normalizeMimeType(mimeType: string): string {
  return mimeType.toLowerCase().split(";")[0].trim();
}

function isZipArchive(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) &&
    (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08)
  );
}

function isLikelyCsv(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, Math.min(buffer.length, 8192));
  if (sample.includes(0)) {
    return false;
  }

  let start = 0;
  if (
    sample.length >= 3 &&
    sample[0] === 0xef &&
    sample[1] === 0xbb &&
    sample[2] === 0xbf
  ) {
    start = 3;
  }

  for (let i = start; i < sample.length; i++) {
    const byte = sample[i];
    if (byte === 0x09 || byte === 0x0a || byte === 0x0d) {
      continue;
    }
    if (byte >= 0x20 && byte <= 0x7e) {
      continue;
    }
    if (byte >= 0x80) {
      continue;
    }
    return false;
  }

  return sample.length > 0;
}

function mimeFromMagicBytes(buffer: Buffer, fileName: string): string | null {
  if (buffer.length < 4) {
    return null;
  }

  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return "application/pdf";
  }

  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (isZipArchive(buffer)) {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "docx") {
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    }
    if (ext === "xlsx") {
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }
    return null;
  }

  if (isLikelyCsv(buffer)) {
    return "text/csv";
  }

  return null;
}

function isAllowedMime(mimeType: string): boolean {
  const normalized = normalizeMimeType(mimeType);
  return ALLOWED_MIMES.includes(normalized);
}

function mimeTypesCompatible(detected: string, declared: string): boolean {
  const normalizedDetected = normalizeMimeType(detected);
  const normalizedDeclared = normalizeMimeType(declared);

  if (normalizedDetected === normalizedDeclared) {
    return true;
  }

  if (
    normalizedDetected === "image/jpeg" &&
    normalizedDeclared === "image/jpg"
  ) {
    return true;
  }

  if (
    normalizedDetected === "text/csv" &&
    (normalizedDeclared === "text/csv" || normalizedDeclared === "application/csv")
  ) {
    return true;
  }

  return false;
}

/** Validate size, declared MIME, and magic-byte signature for an upload buffer. */
export function validateUploadBuffer(
  buffer: Buffer,
  fileName: string,
  declaredMimeType: string
): UploadValidationResult {
  if (buffer.length <= 0) {
    return { ok: false, error: "Empty file" };
  }

  if (buffer.length > MAX_FILE_SIZE) {
    return { ok: false, error: "File must be 20MB or less" };
  }

  const safeName = sanitizeUploadFileName(fileName);
  if (!safeName) {
    return { ok: false, error: "Invalid file name" };
  }

  const declared = normalizeMimeType(declaredMimeType || "application/octet-stream");
  if (!isAllowedMime(declared)) {
    return { ok: false, error: "File type not allowed" };
  }

  const detected = mimeFromMagicBytes(buffer, fileName);
  if (!detected) {
    return { ok: false, error: "File content does not match an allowed document type" };
  }

  if (!mimeTypesCompatible(detected, declared)) {
    return {
      ok: false,
      error: "File content does not match the declared file type",
    };
  }

  return {
    ok: true,
    buffer,
    mimeType: detected,
    fileName: safeName,
  };
}

/** Read a browser File and validate it for upload. */
export async function validateUploadFile(
  file: File
): Promise<UploadValidationResult> {
  if (!(file instanceof File)) {
    return { ok: false, error: "File is required" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return validateUploadBuffer(buffer, file.name, file.type || "application/octet-stream");
}
