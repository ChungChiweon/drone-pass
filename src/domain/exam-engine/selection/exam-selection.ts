import type { GeneratedQuestion } from "@/domain/exam-engine/types";

export type CategoryDistribution = {
  categoryId: string;
  ratio: number;
};

export type DifficultyDistribution = {
  easy: number;
  medium: number;
  hard: number;
};

export type ExamBlueprint = {
  id: string;
  title: string;
  examSize: number;
  categoryDistribution: CategoryDistribution[];
  difficultyDistribution: DifficultyDistribution;
  newQuestionRatio: number;
  reviewRatio: number;
  maxConceptRepeat: number;
  maxFactRepeat: number;
  minQualityScore?: number;
};

export type ExamSelectionCandidate = {
  questionId: string;
  factId: string;
  categoryId: string;
  conceptId: string;
  qualityScore: number;
  examValueScore: number;
  difficulty: GeneratedQuestion["difficulty"];
  isNew: boolean;
  selectedReason: string;
};

export type BalanceEntry = {
  target: number;
  actual: number;
  ratio: number;
};

export type ExamSelectionResult = {
  questions: ExamSelectionCandidate[];
  totalCount: number;
  categoryBalance: Record<string, BalanceEntry>;
  difficultyBalance: Record<GeneratedQuestion["difficulty"], BalanceEntry>;
  duplicateWarnings: string[];
  averageQualityScore: number;
  averageExamValueScore: number;
};

export const DRONE_BASIC_EXAM_BLUEPRINT: ExamBlueprint = {
  id: "drone-basic-exam-40",
  title: "Drone Basic Exam",
  examSize: 40,
  categoryDistribution: [],
  difficultyDistribution: {
    easy: 0.3,
    medium: 0.5,
    hard: 0.2
  },
  newQuestionRatio: 0.25,
  reviewRatio: 0.75,
  maxConceptRepeat: 3,
  maxFactRepeat: 1,
  minQualityScore: 0.65
};
