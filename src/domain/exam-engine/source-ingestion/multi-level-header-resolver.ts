import type { PrecisionCell } from "./table-layout-model";
export function resolveMultiLevelHeaders(cells: PrecisionCell[], headerRows: number[]): PrecisionCell[] {
  const headers = cells.filter((cell) => headerRows.includes(cell.rowIndex) && cell.normalizedText);
  return cells.map((cell) => ({ ...cell, inheritedColumnHeaders: headers
    .filter((header) => header.columnIndex <= cell.columnIndex && header.columnIndex + header.colSpan > cell.columnIndex)
    .map((header) => header.cellId) }));
}
