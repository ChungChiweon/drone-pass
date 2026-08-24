import type { FactCandidate } from "@/domain/exam-engine/knowledge-ingestion/knowledge-ingestion";
import type { FactPromotionDecision, FactPromotionDecisionContext } from "./auto-promotion";
import { calculatePromotionScore } from "./auto-promotion-scorer";
import { hasHighRisk } from "./fact-promotion-risk-detector";

export function decideFactPromotion(candidate: FactCandidate, context: FactPromotionDecisionContext): FactPromotionDecision {
  const scoreResult = calculatePromotionScore(candidate, context.validation, context.duplicateResult, context.graphContext, context.sourceType);
  const highRisk = hasHighRisk(scoreResult.risks);
  const decision = decisionFor(scoreResult.score, context, highRisk);
  const expansionReasons = expansionPriorityReasons(context);

  return {
    candidateId: candidate.candidateId,
    decision,
    confidence: scoreResult.confidence,
    score: scoreResult.score,
    reasons: [...scoreResult.reasons, ...expansionReasons],
    risks: scoreResult.risks,
    signals: scoreResult.signals,
    requiresHumanReview: decision !== "AUTO_APPROVE_CANDIDATE"
  };
}

function expansionPriorityReasons(context: FactPromotionDecisionContext) {
  if (typeof context.expansionScore !== "number") return [];
  if (context.expansionScore >= 0.68) return [`expansion priority signal=${context.expansionScore}`];
  if (context.expansionScore < 0.48) return [`low expansion value signal=${context.expansionScore}`];
  return [`medium expansion value signal=${context.expansionScore}`];
}

function decisionFor(score: number, context: FactPromotionDecisionContext, highRisk: boolean): FactPromotionDecision["decision"] {
  if (score >= 0.9 && !highRisk && context.validation.valid && !context.duplicateResult.isDuplicate && (context.graphContext?.contradictionCount ?? 0) === 0) {
    return "AUTO_APPROVE_CANDIDATE";
  }
  if (score < 0.6 || highRisk) return "REJECT_CANDIDATE";
  return "REVIEW_REQUIRED";
}
