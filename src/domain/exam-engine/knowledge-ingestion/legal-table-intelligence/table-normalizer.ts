import type { LegalTableRow, LegalTableStructure, TableCandidate } from "./legal-table-structure";

export function normalizeLegalTable(candidate: TableCandidate): LegalTableStructure {
  const normalizedRows = candidate.rows.map((row) => row.map(normalizeCell)).filter((row) => row.some(Boolean));
  const headers = inferHeaders(normalizedRows);
  const bodyRows = normalizedRows.slice(headers === normalizedRows[0] ? 1 : 0);
  const columns = headers.map((name, index) => ({ name, index }));
  const rows: LegalTableRow[] = bodyRows.map((values, index) => ({
    rowId: `${candidate.tableId}:row-${index + 1}`,
    values: padRow(values, headers.length),
    sourceText: values.join(" ")
  }));
  return {
    tableId: candidate.tableId,
    sourceLocator: candidate.sourceLocator,
    title: candidate.title,
    headers,
    rows,
    columns,
    category: inferCategory(`${candidate.title ?? ""} ${headers.join(" ")} ${rows.map((row) => row.sourceText).join(" ")}`),
    tableType: inferTableType(`${candidate.title ?? ""} ${headers.join(" ")} ${rows.map((row) => row.sourceText).join(" ")}`)
  };
}

export function normalizeCell(value: string) {
  return value
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .replace(/(\d)\s+(억|만원|원|kg|g|m|년|개월|일|시간)/g, "$1$2")
    .replace(/(\d)\s+(\d{3})(만원|원)/g, "$1$2$3")
    .replace(/억\s+원/g, "억원")
    .replace(/만\s+원/g, "만원")
    .replace(/이\s+상/g, "이상")
    .replace(/이\s+하/g, "이하")
    .trim();
}

function inferHeaders(rows: string[][]) {
  const first = rows[0] ?? [];
  if (first.some((cell) => /(구분|사업|종류|법인|개인|기준|대상|금액|처분)/.test(cell))) return first;
  const width = Math.max(2, ...rows.map((row) => row.length));
  return Array.from({ length: width }, (_, index) => `column-${index + 1}`);
}

function padRow(values: string[], length: number) {
  return Array.from({ length }, (_, index) => values[index] ?? "");
}

function inferCategory(text: string) {
  if (/등록요건|자본금|자산평가액|사업종류|법인.*개인|개인.*법인/.test(text) && /(억|만원|원)/.test(text)) return "registration-requirement";
  if (/벌금|과태료|징역|처분|정지|취소/.test(text)) return "penalty";
  if (/분류|종류|구분|대상/.test(text)) return "classification";
  if (/예외|제외|다만/.test(text)) return "exception";
  if (/기준|요건|별표/.test(text)) return "standard";
  return "general";
}

function inferTableType(text: string): LegalTableStructure["tableType"] {
  if (/등록요건|자본금|자산평가액|요건|법인.*개인|개인.*법인/.test(text) && /(억|만원|원)/.test(text)) return "REQUIREMENT_TABLE";
  if (/벌금|과태료|징역|처분|정지|취소/.test(text)) return "PENALTY_TABLE";
  if (/분류|종류|구분|대상/.test(text)) return "CLASSIFICATION_TABLE";
  if (/예외|제외|다만/.test(text)) return "EXCEPTION_TABLE";
  if (/법인|개인|이상|이하|초과|미만/.test(text)) return "COMPARISON_TABLE";
  return "OTHER";
}
