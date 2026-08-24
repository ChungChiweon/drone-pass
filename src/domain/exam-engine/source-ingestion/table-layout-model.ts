export type PrecisionCell = {
  cellId: string; rowIndex: number; columnIndex: number; rowSpan: number; colSpan: number;
  rawText: string; normalizedText: string; inheritedRowHeaders: string[]; inheritedColumnHeaders: string[];
  applicableFootnotes: string[]; applicableConditions: string[];
  boundingBox?: { x: number; y: number; width: number; height: number }; confidence: number;
};
export type PrecisionTableModel = {
  tableId: string; title: string; pageRange: number[]; headerRows: number[]; bodyRows: number[]; footerRows: number[];
  rowGroups: Array<{ id: string; rows: number[] }>; columnGroups: Array<{ id: string; columns: number[] }>;
  mergedRegions: Array<{ row: number; column: number; rowSpan: number; colSpan: number; status: "RESOLVED_EXACT" | "RESOLVED_INFERRED" | "UNRESOLVED" }>;
  continuedFromTableId?: string; continuesToTableId?: string; notes: string[]; footnotes: PrecisionFootnote[];
  units: string[]; applicabilityScope: string[]; cells: PrecisionCell[]; extractionConfidence: number;
  validationStatus: "EXACT" | "INFERRED" | "UNRESOLVED";
};
export type PrecisionFootnote = { footnoteId: string; marker: string; rawText: string; normalizedText: string; appliesToTable: boolean; appliesToRows: number[]; appliesToColumns: number[]; appliesToCells: string[]; sourceLocator: string; confidence: number };
