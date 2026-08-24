import type { KnowledgeRelation } from "@/domain/exam-engine/types";

export type ErrorType =
  | "KNOWLEDGE_GAP"
  | "CONCEPT_CONFUSION"
  | "NUMERIC_MISTAKE"
  | "EXCEPTION_MISSED"
  | "CARELESS_ERROR";

export type ErrorDiagnosis = {
  learnerId: string;
  questionId: string;
  factId: string;
  conceptId: string;
  errorType: ErrorType;
  errorReason: string;
  confusionFacts: string[];
  relatedFacts: string[];
  recommendedReviewFacts: string[];
  confidence: number;
};

export type TutorLearningContext = {
  errorDiagnosis: ErrorDiagnosis;
  weakFacts: string[];
  relatedFacts: string[];
  graphRelations: KnowledgeRelation[];
  recommendedNextFacts: string[];
};
