import type { AtomicFact, SourceDocument } from "@/domain/exam-engine/types";
import { detectDuplicateFact } from "./fact-duplicate-detector";
import type { FactCandidate, FactPromotionValidationResult } from "./knowledge-ingestion";

export function validateFactPromotion(
  candidate: FactCandidate,
  existingFacts: AtomicFact[],
  sourceDocuments: SourceDocument[] = []
): FactPromotionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!candidate.statement.trim()) errors.push("statement is required");
  if (!candidate.sourceReference.documentId || !candidate.sourceReference.locator) errors.push("sourceReference is required");
  if (candidate.confidence < 0 || candidate.confidence > 1) errors.push("confidence must be between 0 and 1");
  if (sourceDocuments.length && !sourceDocuments.some((document) => document.id === candidate.sourceReference.documentId)) {
    errors.push(`source document not found: ${candidate.sourceReference.documentId}`);
  }

  const duplicate = detectDuplicateFact(candidate, existingFacts);
  if (duplicate.confidence >= 0.9) {
    errors.push(`duplicate fact confirmed: ${duplicate.matchedFactIds.join(", ")}`);
  } else if (duplicate.isDuplicate) {
    warnings.push(`similar fact exists: ${duplicate.matchedFactIds.join(", ")}`);
  }

  if (!candidate.conceptHint) warnings.push("concept is not confirmed");
  if (!candidate.categoryHint) warnings.push("category is not confirmed");

  return {
    valid: errors.length === 0,
    warnings,
    errors
  };
}
