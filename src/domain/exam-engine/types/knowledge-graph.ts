import type { SourceReference } from "./knowledge";
import type { DifficultyPolicy, QuestionType } from "./template";

export type RelationType =
  | "RELATED"
  | "CONFUSED_WITH"
  | "CONTRASTS_WITH"
  | "PREREQUISITE_FOR"
  | "EXCEPTION_OF"
  | "DERIVED_FROM"
  | "SAME_CONCEPT"
  | "COMPARISON_PAIR"
  | "APPLIES_TO";

export type KnowledgeGraphReviewStatus = "draft" | "reviewed" | "approved" | "rejected" | "held";

export type KnowledgeRelation = {
  id: string;
  packId: string;
  fromFactId: string;
  toFactId: string;
  relationType: RelationType;
  reason: string;
  confidence: number;
  sourceReference?: SourceReference;
  createdAt: string;
  reviewStatus: KnowledgeGraphReviewStatus;
};

export type ExamValueScore = {
  packId: string;
  factId: string;
  frequencyScore: number;
  confusionScore: number;
  importanceScore: number;
  numericRiskScore: number;
  penaltyRiskScore: number;
  difficultyScore: number;
  overallScore: number;
  reason: string;
  updatedAt: string;
  reviewStatus: KnowledgeGraphReviewStatus;
};

export type QuestionGenerationContext = {
  targetFactId: string;
  relatedFactIds: string[];
  confusionFactIds: string[];
  prerequisiteFactIds: string[];
  exceptionFactIds: string[];
  comparisonFactIds: string[];
  difficulty: DifficultyPolicy["level"];
  questionType: QuestionType;
  allowedDistractorFactIds: string[];
  forbiddenDistractorFactIds: string[];
};
