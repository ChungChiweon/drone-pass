export type ConditionScope = "TABLE_GLOBAL" | "COLUMN_GROUP" | "ROW_GROUP" | "ROW" | "CELL" | "FOOTNOTE" | "CROSS_REFERENCE";
export type ScopedCondition = { conditionId: string; text: string; scope: ConditionScope; sourceCellIds: string[] };
const SIGNAL = /(다만|한함|각각|총합|어느 하나|이상|이하|초과|미만|경우|비고)/;
export function resolveConditionScopes(cells: Array<{ cellId: string; normalizedText: string; rowSpan: number; colSpan: number }>): ScopedCondition[] {
  return cells.filter((cell) => SIGNAL.test(cell.normalizedText)).map((cell, index) => ({
    conditionId: `condition:${index + 1}`, text: cell.normalizedText,
    scope: cell.rowSpan > 1 ? "ROW_GROUP" : cell.colSpan > 1 ? "COLUMN_GROUP" : "CELL", sourceCellIds: [cell.cellId],
  }));
}
