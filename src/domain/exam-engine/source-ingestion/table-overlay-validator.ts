export type OverlayBox = { x: number; y: number; width: number; height: number };

export type TableOverlayEvidence = {
  page: number;
  pageWidth: number;
  pageHeight: number;
  tableBoundary?: OverlayBox;
  rowBoundaries: OverlayBox[];
  columnBoundaries: OverlayBox[];
  mergedRegions: OverlayBox[];
  textBoxes: Array<OverlayBox & { text: string }>;
  headerBoxes: OverlayBox[];
  footnoteBoxes: OverlayBox[];
  continuationVerified?: boolean;
};

export type TableOverlayValidationResult = {
  tableId: string;
  boundaryMatchScore: number;
  rowMatchScore: number;
  columnMatchScore: number;
  mergedCellMatchScore: number;
  textCoverageScore: number;
  headerMatchScore: number;
  continuationMatchScore: number;
  footnoteAreaMatchScore: number;
  visualMatchScore: number;
  flaggedRegions: string[];
  status: "VERIFIED" | "VERIFIED_WITH_WARNINGS" | "UNRESOLVED";
};

const ratio = (actual: number, expected: number) =>
  expected === 0 ? 1 : Math.max(0, Math.min(1, actual / expected));

export function validateTableOverlay(input: {
  tableId: string;
  evidence: TableOverlayEvidence[];
  expectedRows: number;
  expectedColumns: number;
  expectedMergedRegions: number;
  expectedTextCells: number;
  requiresContinuation?: boolean;
  requiresFootnoteArea?: boolean;
}): TableOverlayValidationResult {
  const boxes = input.evidence.flatMap((page) => page.textBoxes);
  const boundaries = input.evidence.filter((page) => page.tableBoundary);
  const rows = input.evidence.flatMap((page) => page.rowBoundaries);
  const columns = input.evidence.flatMap((page) => page.columnBoundaries);
  const merged = input.evidence.flatMap((page) => page.mergedRegions);
  const headers = input.evidence.flatMap((page) => page.headerBoxes);
  const footnotes = input.evidence.flatMap((page) => page.footnoteBoxes);
  const continuation = !input.requiresContinuation || input.evidence.some((page) => page.continuationVerified);
  const scores = {
    boundary: input.evidence.length ? ratio(boundaries.length, input.evidence.length) : 0,
    rows: ratio(rows.length, input.expectedRows),
    columns: ratio(columns.length, input.expectedColumns),
    merged: ratio(merged.length, input.expectedMergedRegions),
    text: ratio(boxes.length, input.expectedTextCells),
    header: input.expectedColumns === 0 ? 1 : ratio(headers.length, input.expectedColumns),
    continuation: continuation ? 1 : 0,
    footnote: input.requiresFootnoteArea ? (footnotes.length ? 1 : 0) : 1,
  };
  const visual = Number((Object.values(scores).reduce((sum, score) => sum + score, 0) / 8).toFixed(4));
  const flaggedRegions = Object.entries(scores).filter(([, score]) => score < 0.9).map(([name]) => name.toUpperCase());
  const status = visual >= 0.95 && flaggedRegions.length === 0
    ? "VERIFIED"
    : input.evidence.length && boxes.length
      ? "VERIFIED_WITH_WARNINGS"
      : "UNRESOLVED";
  return {
    tableId: input.tableId,
    boundaryMatchScore: scores.boundary,
    rowMatchScore: scores.rows,
    columnMatchScore: scores.columns,
    mergedCellMatchScore: scores.merged,
    textCoverageScore: scores.text,
    headerMatchScore: scores.header,
    continuationMatchScore: scores.continuation,
    footnoteAreaMatchScore: scores.footnote,
    visualMatchScore: visual,
    flaggedRegions,
    status,
  };
}
