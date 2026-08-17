export type TableReviewDecision = {
  tableId: string;
  reviewerDecision: "VERIFIED" | "VERIFIED_WITH_WARNINGS" | "UNRESOLVED";
  resolvedRegions: string[];
  resolvedFootnotes: Array<{
    footnoteId: string;
    resolution: "RESOLVED_EXACT" | "RESOLVED_WITH_WARNING" | "UNRESOLVED";
    scopeType: "WHOLE_TABLE" | "COLUMN_GROUP" | "COLUMN" | "ROW_GROUP" | "ROW" | "CELL" | "MULTIPLE_CELLS" | "UNRESOLVED";
    targetRowIds: string[];
    targetColumnIds: string[];
    targetCellIds: string[];
  }>;
  evidence: string[];
  confidence: number;
  reviewedAt?: string;
  notes: string[];
};

export function normalizeTableReviewDecision(
  decision: Omit<TableReviewDecision, "reviewerDecision"> & { reviewerDecision?: TableReviewDecision["reviewerDecision"] },
): TableReviewDecision {
  // Absence of an explicit reviewer decision is deliberately fail-closed.
  return { ...decision, reviewerDecision: decision.reviewerDecision ?? "UNRESOLVED" };
}
