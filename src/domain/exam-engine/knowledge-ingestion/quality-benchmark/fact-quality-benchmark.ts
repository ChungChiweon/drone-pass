import type { FactCandidate, FactDuplicateResult } from "@/domain/exam-engine/knowledge-ingestion/knowledge-ingestion";
import type { FactPromotionDecision, FactPromotionDecisionType } from "@/domain/exam-engine/knowledge-ingestion/auto-promotion";

export type FactQualityGrade = "EXCELLENT" | "GOOD" | "ACCEPTABLE" | "POOR";

export type BenchmarkRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ValidationSignal = {
  sourceValid: boolean;
  statementComplete: boolean;
  subjectPresent: boolean;
  conditionRisk: boolean;
  numericConsistent: boolean;
  operatorCuePresent: boolean;
  legalCuePresent: boolean;
  articleCuePresent: boolean;
  exceptionCuePresent: boolean;
  duplicateRisk: boolean;
};

export type CandidateQualityValidation = {
  candidateId: string;
  validationSignals: ValidationSignal;
  issues: string[];
  score: number;
};

export type FactQualityBenchmarkResult = {
  candidateId: string;
  promotionDecision: FactPromotionDecisionType;
  score: number;
  qualityGrade: FactQualityGrade;
  riskLevel: BenchmarkRiskLevel;
  validationSignals: ValidationSignal;
  issues: string[];
};

export type FactQualityBenchmarkInput = {
  candidate: FactCandidate;
  promotionDecision: FactPromotionDecision;
  duplicateResult: FactDuplicateResult;
  sourceType: "LAW" | "REGULATION" | "TEXTBOOK" | "EXAM" | "OTHER";
};

export type FactQualitySampleReport = {
  group: FactPromotionDecisionType;
  sampleSize: number;
  passRate: number;
  issueRate: number;
  falseApproveRiskRate: number;
  gradeDistribution: Record<FactQualityGrade, number>;
  riskDistribution: Record<BenchmarkRiskLevel, number>;
  samples: FactQualityBenchmarkResult[];
};

export type PromotionThresholdSimulationResult = {
  threshold: number;
  autoApproveCount: number;
  reviewCount: number;
  estimatedRiskCount: number;
  estimatedRiskRate: number;
};
