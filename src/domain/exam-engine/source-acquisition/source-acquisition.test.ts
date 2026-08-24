import { describe, expect, it } from "vitest";
import { isOfficialSourceUrl } from "./official-source-locator";
import { resolveLawAttachments } from "./law-attachment-resolver";
import { resolveLawVersionStatus } from "./law-version-resolver";
import { buildOfficialSourceRegistry, eligibleCurrentSources } from "./official-source-registry";
import { SOURCE_BATCH_001_METADATA } from "./source-batch-001-data";
import { validateSourceDownload } from "./source-download-validator";
import { SOURCE_BATCH_REQUEST_POLICY } from "./source-acquisition-types";

describe("SOURCE-BATCH-001 acquisition boundary", () => {
  it("allows official HTTPS hosts only", () => {
    expect(isOfficialSourceUrl("https://www.law.go.kr/법령/항공안전법")).toBe(true);
    expect(isOfficialSourceUrl("http://www.law.go.kr/법령/항공안전법")).toBe(false);
    expect(isOfficialSourceUrl("https://example.com/law")).toBe(false);
  });

  it("separates current, future, historical and unknown versions", () => {
    expect(resolveLawVersionStatus("2026-07-01", undefined, "2026-08-05")).toBe("CURRENT_EFFECTIVE");
    expect(resolveLawVersionStatus("2026-12-17", undefined, "2026-08-05")).toBe("FUTURE_EFFECTIVE");
    expect(resolveLawVersionStatus("2025-01-01", "2025-12-31", "2026-08-05")).toBe("HISTORICAL");
    expect(resolveLawVersionStatus("invalid", undefined, "2026-08-05")).toBe("UNKNOWN");
  });

  it("rejects MIME mismatch, error HTML and duplicate content", () => {
    const pdf = new TextEncoder().encode("%PDF-1.7 test");
    expect(validateSourceDownload({ httpStatus: 200, declaredMime: "application/pdf", fileName: "law.pdf", bytes: pdf }).status).toBe("READY");
    expect(validateSourceDownload({ httpStatus: 200, declaredMime: "text/html", fileName: "law.pdf", bytes: new TextEncoder().encode("<html>error</html>") }).status).toBe("HTML_ERROR_PAGE");
    expect(validateSourceDownload({ httpStatus: 200, declaredMime: "application/pdf", fileName: "law.pdf", bytes: new TextEncoder().encode("not pdf") }).status).toBe("MIME_MISMATCH");
    expect(validateSourceDownload({ httpStatus: 200, declaredMime: "application/pdf", fileName: "law.pdf", bytes: pdf, checksum: "sha256-known", knownChecksums: new Set(["sha256-known"]) }).status).toBe("DUPLICATE_FILE");
  });

  it("extracts only appendix/form-like official links", () => {
    const items = resolveLawAttachments("law", '<a href="/download/a.hwp">별표 1</a><a href="/x">본문</a>');
    expect(items).toHaveLength(1);
    expect(items[0].attachmentType).toBe("APPENDIX");
  });

  it("registers six validated current sources without making them extracted", () => {
    expect(SOURCE_BATCH_001_METADATA).toHaveLength(6);
    expect(eligibleCurrentSources(SOURCE_BATCH_001_METADATA)).toHaveLength(6);
    expect(SOURCE_BATCH_001_METADATA.every((item) => item.extractionStatus === "READY_FOR_EXTRACTION")).toBe(true);
    expect(buildOfficialSourceRegistry(SOURCE_BATCH_001_METADATA).every((item) => item.currentEffectiveVersionId)).toBe(true);
  });

  it("keeps request pacing, retry and resume policy bounded", () => {
    expect(SOURCE_BATCH_REQUEST_POLICY).toEqual({ minimumIntervalMs: 1_000, maximumRetries: 2, resumePartialDownloads: true });
  });
});
