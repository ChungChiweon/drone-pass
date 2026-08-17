import type { KnowledgeSourceInput } from "@/domain/exam-engine/knowledge-ingestion/knowledge-ingestion";
import type { PdfExtractionResult } from "@/domain/exam-engine/knowledge-ingestion/pdf-quality";
import { extractCoordinateTableCandidates } from "./coordinate-table-extractor";
import type { CoordinateTableExtractionOptions } from "./coordinate-table-extractor";
import type { LegalTableIntelligenceResult } from "./legal-table-structure";
import { detectLegalTables } from "./legal-table-detector";
import { generateTableComparisonRelations } from "./table-comparison-generator";
import { generateTableFactCandidates } from "./table-fact-generator";
import { scoreLegalTableQuality } from "./table-quality-scorer";

export type LegalTableIntelligenceOptions = CoordinateTableExtractionOptions & {
  qualityResult?: PdfExtractionResult;
};

export function analyzeLegalTablesFromPdf(pdfPath: string, source: KnowledgeSourceInput, options: LegalTableIntelligenceOptions = {}): LegalTableIntelligenceResult {
  const coordinateCandidates = extractCoordinateTableCandidates(pdfPath, options);
  const tables = detectLegalTables({
    coordinateCandidates,
    qualityResult: options.qualityResult,
    text: options.qualityResult?.normalizedText ?? source.content,
    sourceId: source.sourceId
  });
  const tableQualityScores = tables.map(scoreLegalTableQuality);
  const factCandidates = generateTableFactCandidates(source, tables);
  const relationCandidates = generateTableComparisonRelations(source, factCandidates);
  return {
    tables,
    tableQualityScores,
    factCandidates,
    relationCandidates,
    questionYield: {
      possibleQuestions: factCandidates.length,
      comparisonQuestions: relationCandidates.filter((relation) => relation.relationType === "COMPARISON_PAIR").length,
      caseJudgmentQuestions: factCandidates.filter((candidate) => candidate.extractedConditions.length > 0).length
    }
  };
}
