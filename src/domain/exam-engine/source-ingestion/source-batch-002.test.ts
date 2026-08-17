import { describe, expect, it } from "vitest";
import { locateOfficialAttachments, resolveAttachmentDownload, validateAttachmentIntegrity } from "../source-acquisition/attachments";
import { buildAnnexFactCandidates } from "./annex-fact-candidate-builder";
import { extractLegalAnnex } from "./legal-annex-extractor";
import { linkTableFootnotes } from "./table-footnote-linker";
import { resolveMergedCells } from "./merged-cell-resolver";
import { reconstructTableGrid } from "./table-grid-reconstructor";

describe("SOURCE-BATCH-002 attachment ingestion", () => {
  it("accepts only official attachment hosts", () => {
    const official = resolveAttachmentDownload({ attachmentId: "a", parentSourceId: "s", parentVersionId: "v", title: "별표 1", attachmentType: "ANNEX", officialPageUrl: "https://www.law.go.kr/x", downloadUrl: "https://www.law.go.kr/LSW/flDownload.do?flSeq=1", versionStatus: "CURRENT_EFFECTIVE", validationStatus: "DISCOVERED", notes: [] });
    expect(official.downloadUrl).toContain("law.go.kr");
    expect(resolveAttachmentDownload({ ...official, downloadUrl: "https://example.com/a.hwp" }).validationStatus).toBe("MANUAL_ACQUISITION_REQUIRED");
  });

  it("parses dynamic official download endpoints", () => {
    const records = locateOfficialAttachments({ parentSourceId: "law", parentVersionId: "v", officialPageUrl: "https://www.law.go.kr/x", effectiveDate: "2026-01-01", html: '<a href="/LSW/flDownload.do?flSeq=12&amp;bylClsCd=200201">[별표 2] 응시기준</a>' });
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ attachmentNumber: "2", attachmentType: "ANNEX", versionStatus: "CURRENT_EFFECTIVE" });
  });

  it("blocks error HTML masquerading as HWP", () => {
    const record = { attachmentId: "a", parentSourceId: "s", parentVersionId: "v", title: "별표", attachmentType: "ANNEX" as const, officialPageUrl: "https://law.go.kr", fileType: "hwp" as const, versionStatus: "CURRENT_EFFECTIVE" as const, validationStatus: "DISCOVERED" as const, notes: [] };
    expect(validateAttachmentIntegrity(record, new TextEncoder().encode("<html>error</html>"), "text/html").validationStatus).toBe("HTML_ERROR_RESPONSE");
  });

  it("reconstructs coordinate rows and preserves merged-cell inheritance", () => {
    const grid = reconstructTableGrid([{ text: "종류", page: 1, x0: 0, y0: 0, x1: 20, y1: 10 }, { text: "기준", page: 1, x0: 30, y0: 0, x1: 50, y1: 10 }, { text: "1종", page: 1, x0: 0, y0: 20, x1: 20, y1: 30 }, { text: "25 kg 초과", page: 1, x0: 30, y0: 20, x1: 70, y1: 30 }]);
    const cells = resolveMergedCells(grid.cells.map((cell) => cell.rowIndex === 1 && cell.columnIndex === 0 ? { ...cell, rawText: "", normalizedText: "" } : cell));
    expect(cells.find((cell) => cell.rowIndex === 1 && cell.columnIndex === 0)?.inheritedHeaders).toContain("종류");
  });

  it("links footnotes and blocks every generated candidate from automatic promotion", () => {
    const annex = extractLegalAnnex({ annexId: "annex", attachmentId: "a", title: "[별표 2] 응시기준", sourceLocator: "별표 2", pageRange: [1], footnotes: ["주 1: 다만 예외"], cells: [{ rowIndex: 0, columnIndex: 0, rowSpan: 1, colSpan: 1, rawText: "종류", normalizedText: "", inheritedHeaders: [], footnoteRefs: [] }, { rowIndex: 1, columnIndex: 0, rowSpan: 1, colSpan: 1, rawText: "1종 ※", normalizedText: "", inheritedHeaders: ["종류"], footnoteRefs: [] }, { rowIndex: 1, columnIndex: 1, rowSpan: 1, colSpan: 1, rawText: "25 kg 초과", normalizedText: "", inheritedHeaders: ["기준"], footnoteRefs: [] }] });
    expect(linkTableFootnotes(annex.cells, annex.footnotes)[1].footnoteRefs).toContain("※");
    const candidates = buildAnnexFactCandidates({ sourceId: "s", sourceVersionId: "v", annex, current: true });
    expect(candidates[0].blockers).toContain("SOURCE_INGESTION_UNVALIDATED");
    expect(candidates[0].standaloneQuestionAllowed).toBe(false);
  });
});
