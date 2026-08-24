import type { GeneratedQuestion } from "@/domain/exam-engine/types";

export type LearningEventType =
  | "QUESTION_ATTEMPT"
  | "QUESTION_CORRECT"
  | "QUESTION_WRONG"
  | "REVIEW_COMPLETE"
  | "MOCK_EXAM_COMPLETE";

export type LearningEvent = {
  learnerId: string;
  eventType: LearningEventType;
  questionId: string;
  factId: string;
  conceptId: string;
  categoryId: string;
  isCorrect: boolean;
  score: number;
  difficulty: GeneratedQuestion["difficulty"];
  timestamp: string;
};
