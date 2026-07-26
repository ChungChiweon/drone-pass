import type { AnswerHistoryRecord, ExamHistoryRecord, ProgressRecord } from "@/lib/boat/storage";

export type LearningStateSnapshot = {
  licenseType: "deprecated";
  progress: ProgressRecord;
  wrongIds: string[];
  answerHistory: AnswerHistoryRecord[];
  examHistory: ExamHistoryRecord[];
  updatedAt: string;
};

export async function syncLearningStateToSupabase() {
  return { ok: false, skipped: true, reason: "DEPRECATED_LEGACY_SUPABASE_SYNC" };
}

export async function loadLearningStateFromSupabase() {
  return { ok: false, skipped: true, reason: "DEPRECATED_LEGACY_SUPABASE_SYNC", snapshot: null };
}

export function queueLearningStateSync() {
  return;
}
