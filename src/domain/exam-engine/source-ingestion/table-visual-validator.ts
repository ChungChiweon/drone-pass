export type TableVisualValidation = { tableId: string; visualMatchScore: number; boundaryMatchScore: number; textCoverageScore: number; headerMatchScore: number; footnoteMatchScore: number; flaggedRegions: string[] };
export function validateTableVisual(input: { tableId: string; renderedPages: number; cells: unknown[]; unresolvedMerged: number; unresolvedFootnotes: number }): TableVisualValidation {
  const rendered = input.renderedPages > 0 ? 1 : 0;
  const boundary = input.cells.length > 0 ? Math.max(0, 1 - input.unresolvedMerged / input.cells.length) : 0;
  const footnote = input.unresolvedFootnotes === 0 ? 1 : 0;
  const visual = Number(((rendered + boundary + footnote) / 3).toFixed(4));
  return { tableId: input.tableId, visualMatchScore: visual, boundaryMatchScore: boundary, textCoverageScore: input.cells.length ? 1 : 0, headerMatchScore: input.cells.length ? 1 : 0, footnoteMatchScore: footnote, flaggedRegions: visual < 0.95 ? ["VISUAL_REVIEW_REQUIRED"] : [] };
}
