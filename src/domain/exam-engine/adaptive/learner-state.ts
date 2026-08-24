import type { GeneratedQuestion } from "@/domain/exam-engine/types";

export type LearningStatus = "new" | "learning" | "mastered" | "review_needed";

export type LearnerKnowledgeState = {
  learnerId: string;
  packId: string;
  factId: string;
  masteryScore: number;
  confidenceScore: number;
  attemptCount: number;
  correctCount: number;
  wrongCount: number;
  wrongPatternTags: string[];
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
  learningStatus: LearningStatus;
};

export type LearnerAttemptEvent = {
  learnerId: string;
  questionId: string;
  factId: string;
  isCorrect: boolean;
  selectedAnswer: string;
  correctAnswer: string;
  difficulty: GeneratedQuestion["difficulty"];
  timestamp: string;
};

export type AdaptivePriorityScore = {
  factId: string;
  priorityScore: number;
  reason: string;
};
