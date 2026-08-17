import type { EncodingQuality, ExtractionWarning, PdfQualityScore, PdfSection, PdfTable, PreservedNumber } from "./pdf-extraction-quality";

export function scorePdfExtractionQuality(input: {
  encoding: EncodingQuality;
  sections: PdfSection[];
  tables: PdfTable[];
  preservedNumbers: PreservedNumber[];
  extractedText: string;
  normalizedText: string;
}): PdfQualityScore {
  const structureScore = scoreStructure(input.sections, input.normalizedText);
  const tableScore = scoreTables(input.tables, input.normalizedText);
  const numericScore = scoreNumbers(input.preservedNumbers, input.extractedText);
  const overallScore = round(
    (input.encoding.score * 0.25) +
    (structureScore * 0.25) +
    (tableScore * 0.25) +
    (numericScore * 0.25)
  );
  return {
    encodingScore: input.encoding.score,
    structureScore,
    tableScore,
    numericScore,
    overallScore
  };
}

export function qualityWarnings(score: PdfQualityScore): ExtractionWarning[] {
  const warnings: ExtractionWarning[] = [];
  if (score.structureScore < 0.5) warnings.push({ type: "STRUCTURE_LOSS", severity: "MEDIUM", message: "Legal article/appendix structure signals are weak." });
  if (score.tableScore < 0.5) warnings.push({ type: "TABLE_LOSS", severity: "MEDIUM", message: "No reliable table structure was detected." });
  if (score.numericScore < 0.7) warnings.push({ type: "NUMBER_LOSS", severity: "HIGH", message: "Numeric/unit preservation is weak." });
  return warnings;
}

function scoreStructure(sections: PdfSection[], text: string) {
  const articleCount = countMatches(text, /제\s*\d+\s*조/g);
  const appendixCount = countMatches(text, /별표|별지|부칙/g);
  return round(Math.min(1, (sections.length * 0.04) + (articleCount * 0.015) + (appendixCount * 0.08)));
}

function scoreTables(tables: PdfTable[], text: string) {
  if (tables.length) return round(Math.min(1, 0.45 + tables.length * 0.12));
  return /(법인|개인|구분|기준|자본금|자산평가액).{0,80}(만원|억원|\d)/.test(text) ? 0.35 : 0.15;
}

function scoreNumbers(numbers: PreservedNumber[], text: string) {
  const rawNumberCount = countMatches(text, /\d/g);
  if (!rawNumberCount) return 1;
  return round(Math.min(1, numbers.length / Math.max(1, rawNumberCount / 3)));
}

function countMatches(text: string, pattern: RegExp) {
  return [...text.matchAll(pattern)].length;
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
