import type { AnnexCell } from "./legal-annex-extractor";

export function resolveMergedCells(cells: AnnexCell[]): AnnexCell[] {
  return cells.map((cell, index, all) => {
    if (cell.normalizedText) return { ...cell };
    const above = [...all].reverse().find((candidate) => candidate.columnIndex === cell.columnIndex && candidate.rowIndex < cell.rowIndex && candidate.normalizedText);
    return above ? { ...cell, inheritedHeaders: [...new Set([...cell.inheritedHeaders, above.normalizedText])] } : { ...cell };
  });
}

