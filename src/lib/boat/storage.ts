"use client";

export type LegacyLicenseType = "deprecated";

export type ProgressRecord = {
  totalAttempts: number;
  solvedIds: string[];
  correctIds: string[];
  wrongIds: string[];
  categorySolved: Record<string, string[]>;
};

export type ExamHistoryRecord = {
  id: string;
  total: number;
  correct: number;
  score: number;
  firstClassPassed: boolean;
  secondClassPassed: boolean;
  createdAt: string;
};

export type AnswerHistoryRecord = {
  questionId: string;
  licenseType: LegacyLicenseType;
  category: string;
  subCategory: string;
  detailCategory: string;
  tags: string[];
  correct: boolean;
  answeredAt: string;
};

function emptyProgress(): ProgressRecord {
  return {
    totalAttempts: 0,
    solvedIds: [],
    correctIds: [],
    wrongIds: [],
    categorySolved: {}
  };
}

export function readWrongIds() {
  return [] as string[];
}

export function saveWrongQuestion() {
  return;
}

export function removeWrongQuestion() {
  return;
}

export function readWrongQuestions() {
  return [];
}

export function readProgress(): ProgressRecord {
  return emptyProgress();
}

export async function hydrateLearningStateFromSupabase() {
  return { ok: false, skipped: true, reason: "DEPRECATED_LEGACY_STORAGE" };
}

export function recordAnswer() {
  return;
}

export function readAnswerHistory(): AnswerHistoryRecord[] {
  return [];
}

export function saveAnswerHistory() {
  return;
}

export function readExamHistory(): ExamHistoryRecord[] {
  return [];
}

export function saveExamHistory() {
  return;
}

export function resetProgress() {
  return;
}
