import { createHash } from "crypto";

export const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "text/plain"
]);

export function isAllowedUploadType(fileName: string, mimeType: string) {
  if (ALLOWED_UPLOAD_MIME_TYPES.has(mimeType)) {
    return true;
  }

  const ext = fileName.split(".").pop()?.toLowerCase();
  return ["pdf", "jpg", "jpeg", "png", "heic", "heif", "txt"].includes(ext ?? "");
}

export function buildDocumentStoragePath(caseId: string, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
  return `cases/${caseId}/${Date.now()}-${safeName}`;
}

export function checksumBuffer(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export function canPreviewInline(mimeType: string) {
  return mimeType === "application/pdf" || mimeType.startsWith("image/");
}
