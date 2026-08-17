export function resolveTableContinuation<T extends { tableId: string; title: string }>(tables: T[]): Array<T & { continuedFromTableId?: string; continuesToTableId?: string }> {
  return tables.map((table, index) => {
    const previous = tables[index - 1]; const next = tables[index + 1];
    return { ...table,
      continuedFromTableId: previous?.title === table.title ? previous.tableId : undefined,
      continuesToTableId: next?.title === table.title ? next.tableId : undefined };
  });
}
