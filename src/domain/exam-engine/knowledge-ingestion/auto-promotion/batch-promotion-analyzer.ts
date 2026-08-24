import type { CandidateAnalysisInput, FactPromotionDecision, PromotionBatchReport, PromotionRiskLevel } from "./auto-promotion";
import { decideFactPromotion } from "./auto-promotion-engine";

export function analyzeCandidates(candidates: CandidateAnalysisInput[]): PromotionBatchReport {
  const decisions = candidates.map((input) => decideFactPromotion(input.candidate, input.context));
  const autoApproveCandidates = decisions.filter((decision) => decision.decision === "AUTO_APPROVE_CANDIDATE");
  const reviewRequiredCandidates = decisions.filter((decision) => decision.decision === "REVIEW_REQUIRED");
  const rejectedCandidates = decisions.filter((decision) => decision.decision === "REJECT_CANDIDATE");

  return {
    totalCandidates: decisions.length,
    autoApproveCandidates,
    reviewRequiredCandidates,
    rejectedCandidates,
    averageConfidence: round(average(decisions.map((decision) => decision.confidence))),
    riskDistribution: riskDistribution(decisions),
    promotionCoverageImpact: {
      expectedQuestionIncrease: sumCoverageMetric(candidates, "expectedQuestionIncrease", autoApproveCandidates),
      expectedCoverageIncrease: sumCoverageMetric(candidates, "expectedCoverageIncrease", autoApproveCandidates)
    }
  };
}

function sumCoverageMetric(
  inputs: CandidateAnalysisInput[],
  metric: "expectedQuestionIncrease" | "expectedCoverageIncrease",
  selectedDecisions: FactPromotionDecision[]
) {
  const selectedIds = new Set(selectedDecisions.map((decision) => decision.candidateId));
  return inputs
    .filter((input) => selectedIds.has(input.candidate.candidateId))
    .reduce((sum, input) => sum + (input.context.graphContext?.[metric] ?? 0), 0);
}

function riskDistribution(decisions: FactPromotionDecision[]): Record<PromotionRiskLevel, number> {
  const distribution: Record<PromotionRiskLevel, number> = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  for (const decision of decisions) {
    const levels = new Set(decision.risks.map((risk) => risk.level));
    for (const level of levels) distribution[level] += 1;
  }
  return distribution;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
