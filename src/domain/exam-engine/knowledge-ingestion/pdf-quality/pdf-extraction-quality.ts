export type ExtractionWarningType = "ENCODING_ERROR" | "TABLE_LOSS" | "STRUCTURE_LOSS" | "NUMBER_LOSS" | "PAGE_ORDER_ERROR";

export type ExtractionWarning = {
  type: ExtractionWarningType;
  message: string;
  pageNumber?: number;
  severity: "LOW" | "MEDIUM" | "HIGH";
};

export type PdfPageText = {
  pageNumber: number;
  text: string;
  normalizedText: string;
};

export type PdfTable = {
  tableId: string;
  pageNumber?: number;
  sourceLocator: string;
  headers: string[];
  rows: string[][];
};

export type PdfSection = {
  sectionId: string;
  title: string;
  sourceLocator: string;
  text: string;
};

export type EncodingQuality = {
  score: number;
  corruptedCharacters: number;
  affectedPages: number[];
  replacementCharacters: number;
  abnormalUnicodeCount: number;
};

export type PreservedNumber = {
  raw: string;
  value: number;
  unit?: string;
  operator?: "GREATER_EQUAL" | "LESS_EQUAL" | "GREATER_THAN" | "LESS_THAN" | "EQUAL" | "RANGE";
  normalized: string;
  sourceLocator?: string;
};

export type LegalTableFactCandidate = {
  tableId: string;
  category: "APPENDIX" | "FORM" | "STANDARD_TABLE" | "REGISTRATION_REQUIREMENT" | "PENALTY_TABLE" | "GENERAL_TABLE";
  row: number;
  column: string;
  value: string;
  sourceLocator: string;
};

export type PdfQualityScore = {
  encodingScore: number;
  structureScore: number;
  tableScore: number;
  numericScore: number;
  overallScore: number;
};

export type PdfExtractionResult = {
  sourceId: string;
  pages: PdfPageText[];
  extractedText: string;
  normalizedText: string;
  tables: PdfTable[];
  sections: PdfSection[];
  preservedNumbers: PreservedNumber[];
  legalTableCandidates: LegalTableFactCandidate[];
  extractionQualityScore: PdfQualityScore;
  warnings: ExtractionWarning[];
};
