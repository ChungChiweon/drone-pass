import type { GeneratedQuestion } from "@/domain/exam-engine/types";
import type { ErrorDiagnosis } from "./error-diagnosis";

export type ExplanationStrategy =
  | "CONCEPT_REVIEW"
  | "CONFUSION_CLARIFICATION"
  | "NUMERIC_EXPLANATION"
  | "EXCEPTION_EXPLANATION"
  | "QUICK_REMINDER";

export type TutorResponseTone = "encouraging" | "direct" | "exam-focused";

export type TutorResponseContext = {
  learnerId: string;
  questionId: string;
  errorDiagnosis: ErrorDiagnosis;
  explanationFacts: string[];
  relatedFacts: string[];
  recommendedReviewFacts: string[];
  difficulty: GeneratedQuestion["difficulty"];
  tone: TutorResponseTone;
};

export type TutorResponseTemplate = {
  title: string;
  summary: string;
  keyPoints: string[];
  relatedFacts: string[];
  nextAction: string;
};
