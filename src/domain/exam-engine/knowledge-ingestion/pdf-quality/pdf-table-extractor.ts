import type { PdfTable } from "./pdf-extraction-quality";

export function extractPdfTables(text: string, sourceId: string): PdfTable[] {
  const blocks = text.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  const tables: PdfTable[] = [];
  for (const [index, block] of blocks.entries()) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const table = parsePipeTable(lines, sourceId, index) ?? parseWhitespaceTable(lines, sourceId, index);
    if (table) tables.push(table);
  }
  return tables;
}

function parsePipeTable(lines: string[], sourceId: string, index: number): PdfTable | null {
  const pipeLines = lines.filter((line) => line.includes("|"));
  if (pipeLines.length < 2) return null;
  const rows = pipeLines
    .map((line) => line.split("|").map((cell) => cell.trim()).filter(Boolean))
    .filter((row) => row.length >= 2 && !row.every((cell) => /^-+$/.test(cell)));
  if (rows.length < 2) return null;
  return {
    tableId: `${sourceId}:table-${index + 1}`,
    sourceLocator: `table:block-${index + 1}`,
    headers: rows[0] ?? [],
    rows: rows.slice(1)
  };
}

function parseWhitespaceTable(lines: string[], sourceId: string, index: number): PdfTable | null {
  const candidateLines = lines.filter((line) => hasTableSignal(line));
  if (candidateLines.length < 2) return null;
  const rows = candidateLines
    .map((line) => line.split(/\s{2,}|\t/g).map((cell) => cell.trim()).filter(Boolean))
    .filter((row) => row.length >= 2);
  if (rows.length < 2) return null;
  return {
    tableId: `${sourceId}:table-${index + 1}`,
    sourceLocator: `table:block-${index + 1}`,
    headers: inferHeaders(rows),
    rows: rows.slice(1)
  };
}

function hasTableSignal(line: string) {
  const hasMultipleColumns = /\S+\s{2,}\S+/.test(line) || line.includes("\t");
  const hasLegalTableCue = /(법인|개인|사업종류|구분|기준|금액|자본금|자산평가액|벌금|과태료|기간)/.test(line);
  return hasMultipleColumns && (hasLegalTableCue || /\d/.test(line));
}

function inferHeaders(rows: string[][]) {
  const first = rows[0] ?? [];
  if (first.some((cell) => /(법인|개인|구분|사업|기준|금액)/.test(cell))) return first;
  return first.map((_, index) => `column-${index + 1}`);
}
