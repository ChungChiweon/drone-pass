import type { FactCandidate } from "@/domain/exam-engine/knowledge-ingestion/knowledge-ingestion";
import type { KnowledgeRelation } from "@/domain/exam-engine/types";

export type LegalTableType = "REQUIREMENT_TABLE" | "PENALTY_TABLE" | "CLASSIFICATION_TABLE" | "EXCEPTION_TABLE" | "COMPARISON_TABLE" | "OTHER";

export type LegalTableColumn = {
  name: string;
  index: number;
};

export type LegalTableRow = {
  rowId: string;
  values: string[];
  sourceText: string;
};

export type LegalTableStructure = {
  tableId: string;
  sourceLocator: string;
  title?: string;
  headers: string[];
  rows: LegalTableRow[];
  columns: LegalTableColumn[];
  category: string;
  tableType: LegalTableType;
};

export type CoordinateTextCell = {
  text: string;
  x0: number;
  x1: number;
  top: number;
  bottom: number;
  pageNumber: number;
};

export type TableCandidate = {
  tableId: string;
  pageNumber?: number;
  sourceLocator: string;
  title?: string;
  cells: CoordinateTextCell[];
  rows: string[][];
  confidence: number;
};

export type TableQualityScore = {
  tableId: string;
  headerConfidence: number;
  rowConsistency: number;
  numericPreservation: number;
  sourceLocatorScore: number;
  extractionConfidence: number;
  overallScore: number;
};

export type TableFactCandidate = FactCandidate & {
  tableMetadata: {
    tableId: string;
    rowId: string;
    column: string;
    value: string;
    unit?: string;
    sourceLocator: string;
  };
};

export type TableRelationCandidate = Omit<KnowledgeRelation, "reviewStatus" | "createdAt"> & {
  reviewStatus: "draft";
  createdAt: string;
};

export type LegalTableIntelligenceResult = {
  tables: LegalTableStructure[];
  tableQualityScores: TableQualityScore[];
  factCandidates: TableFactCandidate[];
  relationCandidates: TableRelationCandidate[];
  questionYield: {
    possibleQuestions: number;
    comparisonQuestions: number;
    caseJudgmentQuestions: number;
  };
};
