import { describe, expect, it } from "vitest";
import { detectTableFootnoteMarkers } from "./table-footnote-marker-detector";
import { resolveTableFootnoteScope } from "./table-footnote-scope-resolver";
import { validateTableOverlay } from "./table-overlay-validator";

describe("SOURCE-BATCH-002B table evidence", () => {
  it("does not verify a table without official render evidence", () => {
    expect(validateTableOverlay({ tableId: "t", evidence: [], expectedRows: 2, expectedColumns: 2, expectedMergedRegions: 0, expectedTextCells: 4 }).status).toBe("UNRESOLVED");
  });
  it("uses coordinate evidence and flags incomplete geometry", () => {
    const result = validateTableOverlay({ tableId: "t", evidence: [{ page: 1, pageWidth: 100, pageHeight: 100, tableBoundary: { x: 0, y: 0, width: 90, height: 90 }, rowBoundaries: [], columnBoundaries: [], mergedRegions: [], textBoxes: [{ x: 1, y: 1, width: 5, height: 5, text: "기준" }], headerBoxes: [], footnoteBoxes: [] }], expectedRows: 2, expectedColumns: 2, expectedMergedRegions: 0, expectedTextCells: 4 });
    expect(result.status).toBe("VERIFIED_WITH_WARNINGS");
    expect(result.flaggedRegions).toContain("ROWS");
  });
  it("detects markers and blocks a scope below 0.90 confidence", () => {
    const [marker] = detectTableFootnoteMarkers([{ text: "※", page: 1, boundingBox: { x: 1, y: 2, width: 3, height: 4 } }]);
    expect(marker.markerType).toBe("SYMBOL");
    expect(resolveTableFootnoteScope({ marker }).scopeType).toBe("UNRESOLVED");
  });
  it("resolves an explicitly anchored cell marker", () => {
    const [marker] = detectTableFootnoteMarkers([{ text: "주1", page: 1, sourceCellId: "c1", boundingBox: { x: 1, y: 2, width: 3, height: 4 } }]);
    expect(resolveTableFootnoteScope({ marker }).scopeType).toBe("CELL");
  });
});
