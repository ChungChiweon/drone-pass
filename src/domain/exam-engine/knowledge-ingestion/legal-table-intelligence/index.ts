export type {
  CoordinateTextCell,
  LegalTableColumn,
  LegalTableIntelligenceResult,
  LegalTableRow,
  LegalTableStructure,
  LegalTableType,
  TableCandidate,
  TableFactCandidate,
  TableQualityScore,
  TableRelationCandidate
} from "./legal-table-structure";
export { extractCoordinateTableCandidates } from "./coordinate-table-extractor";
export type { CoordinateTableExtractionOptions } from "./coordinate-table-extractor";
export { detectLegalTables } from "./legal-table-detector";
export { normalizeCell, normalizeLegalTable } from "./table-normalizer";
export { generateTableFactCandidates } from "./table-fact-generator";
export { generateTableComparisonRelations } from "./table-comparison-generator";
export { scoreLegalTableQuality } from "./table-quality-scorer";
export { analyzeLegalTablesFromPdf } from "./legal-table-intelligence-pipeline";
export type { LegalTableIntelligenceOptions } from "./legal-table-intelligence-pipeline";
