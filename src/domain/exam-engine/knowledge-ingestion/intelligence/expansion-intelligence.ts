import type { CoverageGap, ExamCoverageReport } from "@/domain/exam-engine/coverage";
import type { FactCandidate } from "@/domain/exam-engine/knowledge-ingestion/knowledge-ingestion";
import type { QuestionTemplate } from "@/domain/exam-engine/types";
import type { FactPromotionDecision } from "@/domain/exam-engine/knowledge-ingestion/auto-promotion";

export type ExpansionPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type CoverageImpact = {
  newCategories: string[];
  newConcepts: string[];
  resolvedGaps: CoverageGap[];
  coverageIncrease: number;
};

export type QuestionYieldPrediction = {
  expectedQuestions: number;
  expectedTemplates: string[];
  difficultyRange: Array<QuestionTemplate["difficulty"]>;
  distractorPotential: number;
};

export type GraphPotential = {
  existingConceptConnectionScore: number;
  confusedWithPotential: number;
  comparisonPairPotential: number;
  prerequisitePotential: number;
  isolatedFactResolutionScore: number;
  overallGraphPotential: number;
  reasons: string[];
};

export type FactNoveltyScore = {
  noveltyScore: number;
  duplicateRisk: number;
  reasons: string[];
};

export type KnowledgeExpansionScore = {
  candidateId: string;
  qualityScore: number;
  coverageImpactScore: number;
  examYieldScore: number;
  graphPotentialScore: number;
  noveltyScore: number;
  finalExpansionScore: number;
  priority: ExpansionPriority;
  reasons: string[];
};

export type KnowledgeExpansionScoringContext = {
  currentCoverage: ExamCoverageReport;
  questionTemplates: QuestionTemplate[];
  existingConceptIds?: string[];
  existingCategoryIds?: string[];
  existingFactSignals?: Array<{
    conceptId?: string;
    predicate?: string;
    value?: string | number | boolean;
    sourceDocumentId?: string;
  }>;
  graphContext?: {
    relatedFactCount?: number;
    confusedWithPossible?: boolean;
    comparisonPairPossible?: boolean;
    prerequisitePossible?: boolean;
    resolvesIsolatedFact?: boolean;
  };
  qualityScore?: number;
  autoPromotionDecision?: FactPromotionDecision;
};

export type ExpansionCandidateInput = {
  candidate: FactCandidate;
  context: KnowledgeExpansionScoringContext;
};

export type ExpansionBatchReport = {
  totalCandidates: number;
  topCandidates: KnowledgeExpansionScore[];
  averageScore: number;
  predictedQuestionIncrease: number;
  predictedCoverageIncrease: number;
  priorityDistribution: Record<ExpansionPriority, number>;
  autoPromotionSummary?: {
    highQualityLowExpansion: number;
    highQualityHighExpansion: number;
  };
};
