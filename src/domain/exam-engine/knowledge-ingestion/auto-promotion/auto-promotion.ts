import type { FactCandidate, FactDuplicateResult, FactPromotionValidationResult } from "@/domain/exam-engine/knowledge-ingestion/knowledge-ingestion";

export type FactPromotionDecisionType = "AUTO_APPROVE_CANDIDATE" | "REVIEW_REQUIRED" | "REJECT_CANDIDATE";

export type PromotionRiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type PromotionSignal = {
  sourceConfidence: number;
  duplicateScore: number;
  contradictionScore: number;
  legalReferenceScore: number;
  numericConsistencyScore: number;
  graphCompatibilityScore: number;
  examValueScore: number;
  legalArticleContextScore?: number;
  conditionCompletenessScore?: number;
  exceptionCompletenessScore?: number;
};

export type FactPromotionDecision = {
  candidateId: string;
  decision: FactPromotionDecisionType;
  confidence: number;
  score: number;
  reasons: string[];
  risks: PromotionRisk[];
  signals: PromotionSignal;
  requiresHumanReview: boolean;
};

export type PromotionRisk = {
  level: PromotionRiskLevel;
  code: string;
  reason: string;
};

export type AutoPromotionGraphContext = {
  relatedFactCount?: number;
  compatibleRelationCount?: number;
  contradictionCount?: number;
  examValueScore?: number;
  expectedQuestionIncrease?: number;
  expectedCoverageIncrease?: number;
};

export type FactPromotionDecisionContext = {
  validation: FactPromotionValidationResult;
  duplicateResult: FactDuplicateResult;
  graphContext?: AutoPromotionGraphContext;
  sourceType?: "LAW" | "REGULATION" | "TEXTBOOK" | "EXAM" | "OTHER";
  expansionScore?: number;
};

export type PromotionScoreResult = {
  score: number;
  confidence: number;
  signals: PromotionSignal;
  reasons: string[];
  risks: PromotionRisk[];
};

export type PromotionCoverageImpact = {
  expectedQuestionIncrease: number;
  expectedCoverageIncrease: number;
};

export type PromotionBatchReport = {
  totalCandidates: number;
  autoApproveCandidates: FactPromotionDecision[];
  reviewRequiredCandidates: FactPromotionDecision[];
  rejectedCandidates: FactPromotionDecision[];
  averageConfidence: number;
  riskDistribution: Record<PromotionRiskLevel, number>;
  promotionCoverageImpact: PromotionCoverageImpact;
};

export type CandidateAnalysisInput = {
  candidate: FactCandidate;
  context: FactPromotionDecisionContext;
};
