export type {
  AutoPromotionGraphContext,
  CandidateAnalysisInput,
  FactPromotionDecision,
  FactPromotionDecisionContext,
  FactPromotionDecisionType,
  PromotionBatchReport,
  PromotionCoverageImpact,
  PromotionRisk,
  PromotionRiskLevel,
  PromotionScoreResult,
  PromotionSignal
} from "./auto-promotion";
export { calculatePromotionScore, promotionSignals } from "./auto-promotion-scorer";
export { decideFactPromotion } from "./auto-promotion-engine";
export { detectFactPromotionRisks, hasHighRisk } from "./fact-promotion-risk-detector";
export { analyzeCandidates } from "./batch-promotion-analyzer";
