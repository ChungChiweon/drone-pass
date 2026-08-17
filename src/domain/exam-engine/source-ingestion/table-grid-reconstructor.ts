import type { AnnexCell } from "./legal-annex-extractor";

export type PositionedWord = { text: string; page: number; x0: number; y0: number; x1: number; y1: number };
export type ReconstructedGrid = { cells: AnnexCell[]; pageRange: number[]; confidence: number; warnings: string[] };

export function reconstructTableGrid(words: PositionedWord[], yTolerance = 3): ReconstructedGrid {
  if (!words.length) return { cells: [], pageRange: [], confidence: 0, warnings: ["NO_COORDINATE_WORDS"] };
  const ordered = [...words].sort((a, b) => a.page - b.page || a.y0 - b.y0 || a.x0 - b.x0);
  const rows: PositionedWord[][] = [];
  for (const word of ordered) {
    const row = rows.find((candidate) => candidate[0].page === word.page && Math.abs(candidate[0].y0 - word.y0) <= yTolerance);
    if (row) row.push(word); else rows.push([word]);
  }
  const cells = rows.flatMap((row, rowIndex) => row.sort((a, b) => a.x0 - b.x0).map((word, columnIndex) => ({ rowIndex, columnIndex, rowSpan: 1, colSpan: 1, rawText: word.text, normalizedText: word.text.normalize("NFKC").trim(), boundingBox: { x: word.x0, y: word.y0, width: word.x1 - word.x0, height: word.y1 - word.y0 }, inheritedHeaders: [], footnoteRefs: [] })));
  return { cells, pageRange: [...new Set(words.map((word) => word.page))], confidence: Math.min(1, cells.length / Math.max(1, rows.length * 2)), warnings: [] };
}

