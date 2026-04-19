import { describe, expect, it } from "vitest";

import {
  buildDocumentStoragePath,
  canPreviewInline,
  isAllowedUploadType
} from "./uploads";

describe("upload helpers", () => {
  it("accepts supported document types", () => {
    expect(isAllowedUploadType("return.pdf", "application/pdf")).toBe(true);
    expect(isAllowedUploadType("scan.heic", "image/heic")).toBe(true);
    expect(isAllowedUploadType("notes.txt", "text/plain")).toBe(true);
    expect(isAllowedUploadType("archive.zip", "application/zip")).toBe(false);
  });

  it("creates a storage path scoped to the case", () => {
    expect(buildDocumentStoragePath("case-1", "My File.pdf")).toMatch(/^cases\/case-1\/\d+-My-File.pdf$/);
  });

  it("supports inline preview for PDFs and images", () => {
    expect(canPreviewInline("application/pdf")).toBe(true);
    expect(canPreviewInline("image/png")).toBe(true);
    expect(canPreviewInline("text/plain")).toBe(false);
  });
});
