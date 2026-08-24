import type { PrecisionCell, PrecisionTableModel } from "./table-layout-model";
export function resolveMergedCellSemantics(cells: PrecisionCell[]): PrecisionTableModel["mergedRegions"] {
  return cells.filter((cell) => cell.rowSpan > 1 || cell.colSpan > 1).map((cell) => ({
    row: cell.rowIndex, column: cell.columnIndex, rowSpan: cell.rowSpan, colSpan: cell.colSpan,
    status: cell.rawText ? "RESOLVED_EXACT" : "UNRESOLVED",
  }));
}
