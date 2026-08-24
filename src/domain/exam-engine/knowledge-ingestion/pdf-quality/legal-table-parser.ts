import type { LegalTableFactCandidate, PdfTable } from "./pdf-extraction-quality";

export function parseLegalTables(tables: PdfTable[]): LegalTableFactCandidate[] {
  return tables.flatMap((table) => {
    const category = classifyTable(table);
    return table.rows.flatMap((row, rowIndex) =>
      row.map((value, columnIndex) => ({
        tableId: table.tableId,
        category,
        row: rowIndex + 1,
        column: table.headers[columnIndex] ?? `column-${columnIndex + 1}`,
        value,
        sourceLocator: `${table.sourceLocator}:row-${rowIndex + 1}:col-${columnIndex + 1}`
      }))
    );
  });
}

export function classifyTable(table: PdfTable): LegalTableFactCandidate["category"] {
  const text = `${table.sourceLocator} ${table.headers.join(" ")} ${table.rows.flat().join(" ")}`;
  if (/별표|appendix/i.test(text)) return "APPENDIX";
  if (/별지|서식|form/i.test(text)) return "FORM";
  if (/등록요건|자본금|자산평가액|사업종류/.test(text)) return "REGISTRATION_REQUIREMENT";
  if (/벌금|과태료|징역|처벌|행정처분/.test(text)) return "PENALTY_TABLE";
  if (/기준|요건|구분/.test(text)) return "STANDARD_TABLE";
  return "GENERAL_TABLE";
}
