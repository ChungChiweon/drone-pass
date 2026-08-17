import type { ExamValueScore } from "@/domain/exam-engine/types";
import type { QuestionQualityScore } from "@/domain/exam-engine/evaluation/question-quality";
import type { AdaptivePriorityScore, LearnerKnowledgeState } from "./learner-state";

export type AdaptiveScoringOptions = {
  now?: Date;
};

export function calculateAdaptivePriority(
  state: LearnerKnowledgeState,
  examValueScore?: ExamValueScore,
  qualityScore?: QuestionQualityScore,
  options: AdaptiveScoringOptions = {}
): AdaptivePriorityScore {
  const now = options.now ?? new Date();
  const masteryGap = 1 - clamp01(state.masteryScore);
  const confidenceGap = 1 - clamp01(state.confidenceScore);
  const wrongRate = state.attemptCount > 0 ? state.wrongCount / state.attemptCount : 0.4;
  const reviewUrgency = calculateReviewUrgency(state, now);
  const examValue = examValueScore?.overallScore ?? 0.5;
  const quality = qualityScore?.overallScore ?? 0.5;
  const statusBoost = statusPriorityBoost(state.learningStatus);
  const repetitionPenalty = state.learningStatus === "mastered" && reviewUrgency < 0.4 ? 0.35 : 0;
  const priorityScore = roundScore(clamp01(
    (masteryGap * 0.3)
    + (wrongRate * 0.22)
    + (reviewUrgency * 0.18)
    + (examValue * 0.18)
    + (confidenceGap * 0.07)
    + (quality * 0.05)
    + statusBoost
    - repetitionPenalty
  ));

  return {
    factId: state.factId,
    priorityScore,
    reason: [
      `masteryGap=${roundScore(masteryGap)}`,
      `wrongRate=${roundScore(wrongRate)}`,
      `reviewUrgency=${roundScore(reviewUrgency)}`,
      `examValue=${roundScore(examValue)}`,
      `status=${state.learningStatus}`
    ].join("; ")
  };
}

function calculateReviewUrgency(state: LearnerKnowledgeState, now: Date) {
  if (state.nextReviewAt) {
    const nextReviewAt = new Date(state.nextReviewAt);
    if (Number.isNaN(nextReviewAt.getTime())) return daysSinceLastReview(state, now);
    if (nextReviewAt <= now) return 1;
    const daysUntilReview = (nextReviewAt.getTime() - now.getTime()) / 86_400_000;
    return clamp01(0.45 - (daysUntilReview * 0.08));
  }
  return daysSinceLastReview(state, now);
}

function daysSinceLastReview(state: LearnerKnowledgeState, now: Date) {
  if (!state.lastReviewedAt) return 0.75;
  const lastReviewedAt = new Date(state.lastReviewedAt);
  if (Number.isNaN(lastReviewedAt.getTime())) return 0.75;
  const days = Math.max(0, (now.getTime() - lastReviewedAt.getTime()) / 86_400_000);
  return clamp01(days / 14);
}

function statusPriorityBoost(status: LearnerKnowledgeState["learningStatus"]) {
  if (status === "review_needed") return 0.12;
  if (status === "new") return 0.08;
  if (status === "learning") return 0.04;
  return 0;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function roundScore(score: number) {
  return Math.round(score * 100) / 100;
}
