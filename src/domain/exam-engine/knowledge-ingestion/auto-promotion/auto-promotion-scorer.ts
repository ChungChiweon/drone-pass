import type { FactCandidate, FactDuplicateResult, FactPromotionValidationResult } from "@/domain/exam-engine/knowledge-ingestion/knowledge-ingestion";
import type { AutoPromotionGraphContext, FactPromotionDecisionContext, PromotionScoreResult, PromotionSignal } from "./auto-promotion";
import { detectFactPromotionRisks } from "./fact-promotion-risk-detector";

const OFFICIAL_SOURCE_TYPES = new Set(["LAW", "REGULATION"]);

export function calculatePromotionScore(
  candidate: FactCandidate,
  validation: FactPromotionValidationResult,
  duplicateResult: FactDuplicateResult,
  graphContext: AutoPromotionGraphContext = {},
  sourceType: FactPromotionDecisionContext["sourceType"] = "OTHER"
): PromotionScoreResult {
  const context: FactPromotionDecisionContext = { validation, duplicateResult, graphContext, sourceType };
  const risks = detectFactPromotionRisks(candidate, context);
  const signals = promotionSignals(candidate, validation, duplicateResult, graphContext);
  const reasons: string[] = [];

  let score = 0;
  if (candidate.sourceReference.documentId && candidate.sourceReference.locator) {
    score += 0.2;
    reasons.push("sourceReference present +0.20");
  }
  if (OFFICIAL_SOURCE_TYPES.has(sourceType ?? "OTHER")) {
    score += 0.15;
    reasons.push(`official source type ${sourceType} +0.15`);
  }
  if (!duplicateResult.isDuplicate) {
    score += 0.15;
    reasons.push("duplicate none +0.15");
  }
  if (signals.numericConsistencyScore >= 0.9) {
    score += 0.15;
    reasons.push("numeric/unit consistency +0.15");
  }
  if (signals.legalReferenceScore >= 0.75) {
    score += 0.15;
    reasons.push("legal reference signal +0.15");
  }
  if (signals.graphCompatibilityScore > 0) {
    score += 0.1;
    reasons.push("graph connection possible +0.10");
  }
  if (signals.examValueScore >= 0.65) {
    score += 0.1;
    reasons.push("high exam value +0.10");
  }

  if (duplicateResult.isDuplicate) {
    score -= 0.3;
    reasons.push("duplicate candidate -0.30");
  }
  if ((graphContext.contradictionCount ?? 0) > 0) {
    score -= 0.5;
    reasons.push("contradiction detected -0.50");
  }
  if (!candidate.sourceReference.documentId || !candidate.sourceReference.locator) {
    score -= 0.5;
    reasons.push("source missing -0.50");
  }
  if (!validation.valid) {
    score -= Math.min(0.35, validation.errors.length * 0.18);
    reasons.push(`validation errors=${validation.errors.length}`);
  }

  const normalizedScore = clamp(score);
  return {
    score: round(normalizedScore),
    confidence: round(confidenceFromSignals(signals, risks.length, validation)),
    signals,
    reasons,
    risks
  };
}

export function promotionSignals(
  candidate: FactCandidate,
  validation: FactPromotionValidationResult,
  duplicateResult: FactDuplicateResult,
  graphContext: AutoPromotionGraphContext = {}
): PromotionSignal {
  return {
    sourceConfidence: round(clamp(candidate.confidence)),
    duplicateScore: round(clamp(duplicateResult.confidence)),
    contradictionScore: round(clamp(graphContext.contradictionCount ? 1 : 0)),
    legalReferenceScore: round(legalReferenceScore(candidate)),
    numericConsistencyScore: round(numericConsistencyScore(candidate)),
    graphCompatibilityScore: round(clamp(((graphContext.relatedFactCount ?? 0) * 0.08) + ((graphContext.compatibleRelationCount ?? 0) * 0.12))),
    examValueScore: round(clamp(graphContext.examValueScore ?? (validation.valid ? 0.45 : 0.1))),
    legalArticleContextScore: round(legalArticleContextScore(candidate)),
    conditionCompletenessScore: round(conditionCompletenessScore(candidate)),
    exceptionCompletenessScore: round(exceptionCompletenessScore(candidate))
  };
}

function legalReferenceScore(candidate: FactCandidate) {
  const text = `${candidate.sourceReference.documentId} ${candidate.sourceReference.locator} ${candidate.statement}`.toLowerCase();
  let score = 0;
  if (candidate.sourceReference.documentId) score += 0.3;
  if (candidate.sourceReference.locator) score += 0.3;
  if (/법|시행령|시행규칙|별표|조|항|호|목|law|regulation|article|appendix/.test(text)) score += 0.4;
  return clamp(score);
}

function legalArticleContextScore(candidate: FactCandidate) {
  let score = 0;
  if (candidate.legalContext?.articleId) score += 0.45;
  if (candidate.legalContext?.sourceLocator) score += 0.3;
  if (candidate.legalContext?.fullArticleText && candidate.legalContext.fullArticleText.length > candidate.statement.length) score += 0.25;
  return clamp(score);
}

function conditionCompletenessScore(candidate: FactCandidate) {
  let score = 0;
  if (candidate.legalSubject) score += 0.35;
  if (candidate.legalAction) score += 0.35;
  if (candidate.condition || candidate.extractedConditions.length) score += 0.3;
  return clamp(score);
}

function exceptionCompletenessScore(candidate: FactCandidate) {
  if (!candidate.extractedExceptions.length && !candidate.exception) return 1;
  return candidate.legalContext?.articleId ? 1 : 0.5;
}

function numericConsistencyScore(candidate: FactCandidate) {
  if (candidate.extractedNumbers.length === 0) return 1;
  const numberMatches = candidate.extractedNumbers.filter((number) => candidate.statement.includes(number)).length;
  return clamp(numberMatches / candidate.extractedNumbers.length);
}

function confidenceFromSignals(signals: PromotionSignal, riskCount: number, validation: FactPromotionValidationResult) {
  return clamp(
    (signals.sourceConfidence * 0.25) +
    ((1 - signals.duplicateScore) * 0.2) +
    ((1 - signals.contradictionScore) * 0.2) +
    (signals.legalReferenceScore * 0.15) +
    (signals.numericConsistencyScore * 0.1) +
    (signals.examValueScore * 0.1) -
    Math.min(0.2, riskCount * 0.025) -
    Math.min(0.15, validation.warnings.length * 0.03)
  );
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
