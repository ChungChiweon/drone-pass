import type { PrecisionCell } from "./table-layout-model";
export function resolveRowGroups(cells: PrecisionCell[]): Array<{ id: string; rows: number[] }> {
  return cells.filter((cell) => cell.columnIndex === 0 && cell.rowSpan > 1).map((cell) => ({ id: `row-group:${cell.cellId}`, rows: Array.from({ length: cell.rowSpan }, (_, offset) => cell.rowIndex + offset) }));
}
