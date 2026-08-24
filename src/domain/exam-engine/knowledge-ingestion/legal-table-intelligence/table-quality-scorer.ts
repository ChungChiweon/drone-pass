import { preserveNumbers } from "@/domain/exam-engine/knowledge-ingestion/pdf-quality";
import type { LegalTableStructure, TableQualityScore } from "./legal-table-structure";

export function scoreLegalTableQuality(table: LegalTableStructure): TableQualityScore {
  const headerConfidence = scoreHeaders(table);
  const rowConsistency = scoreRows(table);
  const numericPreservation = scoreNumeric(table);
  const sourceLocatorScore = table.sourceLocator ? 1 : 0;
  const extractionConfidence = table.tableType === "OTHER" ? 0.45 : 0.75;
  const overallScore = round(
    (headerConfidence * 0.25) +
    (rowConsistency * 0.25) +
    (numericPreservation * 0.25) +
    (sourceLocatorScore * 0.15) +
    (extractionConfidence * 0.1)
  );
  return {
    tableId: table.tableId,
    headerConfidence,
    rowConsistency,
    numericPreservation,
    sourceLocatorScore,
    extractionConfidence,
    overallScore
  };
}

function scoreHeaders(table: LegalTableStructure) {
  if (!table.headers.length) return 0;
  const meaningful = table.headers.filter((header) => !/^column-\d+$/.test(header) && header.length > 1).length;
  const legalCue = table.headers.some((header) => /(구분|사업|종류|법인|개인|기준|금액|처분|요건)/.test(header)) ? 0.25 : 0;
  return round(Math.min(1, meaningful / table.headers.length + legalCue));
}

function scoreRows(table: LegalTableStructure) {
  if (!table.rows.length || !table.headers.length) return 0;
  const matching = table.rows.filter((row) => row.values.length === table.headers.length).length;
  return round(matching / table.rows.length);
}

function scoreNumeric(table: LegalTableStructure) {
  const cells = table.rows.flatMap((row) => row.values);
  if (!cells.length) return 0;
  const numericCells = cells.filter((cell) => /\d|억|만원|kg|원|년|개월|이상|이하|초과|미만/.test(cell));
  if (!numericCells.length) return 0.35;
  const preserved = numericCells.filter((cell) => preserveNumbers(cell).length > 0 || /억|만원/.test(cell)).length;
  return round(preserved / numericCells.length);
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
