import type { PdfExtractionResult } from "@/domain/exam-engine/knowledge-ingestion/pdf-quality";
import type { LegalTableStructure, TableCandidate } from "./legal-table-structure";
import { normalizeLegalTable } from "./table-normalizer";

export function detectLegalTables(input: { coordinateCandidates?: TableCandidate[]; qualityResult?: PdfExtractionResult; text?: string; sourceId: string }): LegalTableStructure[] {
  const coordinateTables = (input.coordinateCandidates ?? []).map(normalizeLegalTable);
  const qualityTables = (input.qualityResult?.tables ?? []).map((table) => normalizeLegalTable({
    tableId: table.tableId,
    pageNumber: table.pageNumber,
    sourceLocator: table.sourceLocator,
    title: inferTitleFromLocator(table.sourceLocator),
    cells: [],
    rows: [table.headers, ...table.rows],
    confidence: 0.65
  }));
  const textTables = input.text ? detectTextPatternTables(input.text, input.sourceId).map(normalizeLegalTable) : [];
  return uniqueTables([...coordinateTables, ...qualityTables, ...textTables]).filter((table) => table.rows.length > 0);
}

function detectTextPatternTables(text: string, sourceId: string): TableCandidate[] {
  const blocks = text.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  return blocks.flatMap((block, index) => {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    if (!isTableLike(lines)) return [];
    return [{
      tableId: `${sourceId}:text-table-${index + 1}`,
      sourceLocator: `text-table:block-${index + 1}`,
      title: inferTitle(lines),
      cells: [],
      rows: lines.map(splitColumns).filter((row) => row.length >= 2),
      confidence: 0.55
    }];
  });
}

function isTableLike(lines: string[]) {
  if (lines.length < 2) return false;
  const tableCueLines = lines.filter((line) => /(별표|별지|기준|요건|구분|법인|개인|자본금|자산평가액|벌금|과태료)/.test(line));
  const numericLines = lines.filter((line) => /\d|억|만원|kg|년|개월/.test(line));
  const alignedLines = lines.filter((line) => /\S+\s{2,}\S+/.test(line) || line.includes("|"));
  return tableCueLines.length > 0 && numericLines.length > 0 && alignedLines.length >= 2;
}

function splitColumns(line: string) {
  if (line.includes("|")) return line.split("|").map((cell) => cell.trim()).filter(Boolean);
  return line.split(/\s{2,}|\t/g).map((cell) => cell.trim()).filter(Boolean);
}

function inferTitle(lines: string[]) {
  return lines.find((line) => /(별표|별지|기준|요건|표)/.test(line))?.slice(0, 80);
}

function inferTitleFromLocator(locator: string) {
  return locator.includes("appendix") || locator.includes("별표") ? "별표 기준표" : undefined;
}

function uniqueTables(tables: LegalTableStructure[]) {
  const seen = new Set<string>();
  return tables.filter((table) => {
    const signature = `${table.headers.join("|")}::${table.rows.map((row) => row.sourceText).join("|")}`;
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}
