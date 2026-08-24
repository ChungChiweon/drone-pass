import type { FactCandidate } from "@/domain/exam-engine/knowledge-ingestion/knowledge-ingestion";
import type { FactPromotionDecisionContext, PromotionRisk } from "./auto-promotion";

export function detectFactPromotionRisks(candidate: FactCandidate, context: FactPromotionDecisionContext): PromotionRisk[] {
  const risks: PromotionRisk[] = [];

  if (!candidate.sourceReference.documentId || !candidate.sourceReference.locator) {
    risks.push({ level: "HIGH", code: "SOURCE_REFERENCE_MISSING", reason: "sourceReference documentId or locator is missing" });
  }
  if (context.validation.errors.length > 0) {
    for (const error of context.validation.errors) {
      risks.push({ level: "HIGH", code: "VALIDATION_ERROR", reason: error });
    }
  }
  if ((context.graphContext?.contradictionCount ?? 0) > 0) {
    risks.push({ level: "HIGH", code: "CONTRADICTION_DETECTED", reason: `contradictionCount=${context.graphContext?.contradictionCount}` });
  }
  if (hasNumericMismatchRisk(candidate)) {
    risks.push({ level: "HIGH", code: "NUMERIC_CONSISTENCY_RISK", reason: "candidate has extracted numbers but the statement does not clearly include them" });
  }
  if (context.duplicateResult.confidence >= 0.9) {
    risks.push({ level: "HIGH", code: "DUPLICATE_CONFIRMED", reason: `duplicate confidence=${context.duplicateResult.confidence}` });
  } else if (context.duplicateResult.isDuplicate) {
    risks.push({ level: "MEDIUM", code: "DUPLICATE_CANDIDATE", reason: `possible duplicate: ${context.duplicateResult.matchedFactIds.join(", ")}` });
  }
  if (!candidate.conceptHint) {
    risks.push({ level: "MEDIUM", code: "CONCEPT_UNCONFIRMED", reason: "conceptHint is missing" });
  }
  if (!candidate.categoryHint) {
    risks.push({ level: "MEDIUM", code: "CATEGORY_UNCONFIRMED", reason: "categoryHint is missing" });
  }
  if ((context.graphContext?.relatedFactCount ?? 0) === 0 && (context.graphContext?.compatibleRelationCount ?? 0) === 0) {
    risks.push({ level: "MEDIUM", code: "GRAPH_CONNECTION_WEAK", reason: "no related graph or existing fact connection signal" });
  }
  if (context.validation.warnings.some((warning) => /similar|concept|category/i.test(warning))) {
    risks.push({ level: "LOW", code: "REVIEW_WARNING", reason: context.validation.warnings.join("; ") });
  }

  return dedupeRisks(risks);
}

export function hasHighRisk(risks: PromotionRisk[]) {
  return risks.some((risk) => risk.level === "HIGH");
}

function hasNumericMismatchRisk(candidate: FactCandidate) {
  if (candidate.extractedNumbers.length === 0) return false;
  return candidate.extractedNumbers.some((number) => !candidate.statement.includes(number));
}

function dedupeRisks(risks: PromotionRisk[]) {
  const seen = new Set<string>();
  return risks.filter((risk) => {
    const key = `${risk.level}:${risk.code}:${risk.reason}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
