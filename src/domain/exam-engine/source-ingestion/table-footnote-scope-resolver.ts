import type { DetectedFootnoteMarker } from "./table-footnote-marker-detector";

export type FootnoteScopeType = "WHOLE_TABLE" | "COLUMN_GROUP" | "COLUMN" | "ROW_GROUP" | "ROW" | "CELL" | "MULTIPLE_CELLS" | "UNRESOLVED";
export type ResolvedFootnoteScope = {
  footnoteId: string;
  scopeType: FootnoteScopeType;
  targetRowIds: string[];
  targetColumnIds: string[];
  targetCellIds: string[];
  evidence: string[];
  confidence: number;
  unresolvedReason?: string;
};

export function resolveTableFootnoteScope(input: {
  marker: DetectedFootnoteMarker;
  noteText?: string;
  repeatedCellIds?: string[];
  rowId?: string;
  columnId?: string;
  tableLevel?: boolean;
}): ResolvedFootnoteScope {
  let scopeType: FootnoteScopeType = "UNRESOLVED";
  const targetCellIds = [...new Set(input.repeatedCellIds ?? (input.marker.sourceCellId ? [input.marker.sourceCellId] : []))];
  const targetRowIds = input.rowId ? [input.rowId] : [];
  const targetColumnIds = input.columnId ? [input.columnId] : [];
  const evidence: string[] = [];
  let confidence = 0;
  if (input.tableLevel && input.noteText) { scopeType = "WHOLE_TABLE"; confidence = 0.95; evidence.push("explicit table-level note"); }
  else if (targetCellIds.length > 1) { scopeType = "MULTIPLE_CELLS"; confidence = 0.93; evidence.push("same marker repeated across cells"); }
  else if (targetCellIds.length === 1) { scopeType = "CELL"; confidence = 0.92; evidence.push("marker anchored in source cell"); }
  else if (targetRowIds.length) { scopeType = "ROW"; confidence = 0.9; evidence.push("marker aligned with row"); }
  else if (targetColumnIds.length) { scopeType = "COLUMN"; confidence = 0.9; evidence.push("marker aligned with column"); }
  if (confidence < 0.9) return { footnoteId: input.marker.markerId, scopeType: "UNRESOLVED", targetRowIds: [], targetColumnIds: [], targetCellIds: [], evidence, confidence, unresolvedReason: "No positional or semantic scope reached 0.90 confidence" };
  return { footnoteId: input.marker.markerId, scopeType, targetRowIds, targetColumnIds, targetCellIds, evidence, confidence };
}
