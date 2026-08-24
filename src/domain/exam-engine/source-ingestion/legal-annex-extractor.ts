export type AnnexCell = {
  rowIndex: number;
  columnIndex: number;
  rowSpan: number;
  colSpan: number;
  rawText: string;
  normalizedText: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
  inheritedHeaders: string[];
  footnoteRefs: string[];
};

export type LegalAnnex = {
  annexId: string;
  attachmentId: string;
  title: string;
  attachmentNumber?: string;
  sourceLocator: string;
  cells: AnnexCell[];
  footnotes: string[];
  pageRange: number[];
  visualVerificationRequired: boolean;
};

export function extractLegalAnnex(input: Omit<LegalAnnex, "visualVerificationRequired">): LegalAnnex {
  return {
    ...input,
    cells: input.cells.map((cell) => ({ ...cell, normalizedText: normalizeCell(cell.rawText) })),
    visualVerificationRequired: input.cells.some((cell) => !cell.rawText.trim() || cell.rowSpan > 1 || cell.colSpan > 1),
  };
}

export function normalizeCell(value: string): string {
  return value.normalize("NFKC").replace(/(\d)\s+(kg|g|cm|mm|m|시간|분|일|개월|년|만원|억원)\b/gi, "$1$2").replace(/\s+/g, " ").trim();
}

