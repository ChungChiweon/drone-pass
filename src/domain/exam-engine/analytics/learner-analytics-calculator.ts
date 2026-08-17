import type { ExamValueScore } from "@/domain/exam-engine/types";
import type { LearnerKnowledgeState } from "@/domain/exam-engine/adaptive/learner-state";
import type { AdaptiveRecommendationContext, LearnerAnalytics, WeaknessMetric } from "./learner-analytics";
import type { LearningEvent } from "./learning-event";

type AggregatedMetric = {
  id: string;
  attemptCount: number;
  wrongCount: number;
  masteryScores: number[];
  examValueScores: number[];
};

export function calculateLearnerAnalytics(
  events: LearningEvent[],
  learnerStates: LearnerKnowledgeState[],
  examScores: ExamValueScore[]
): LearnerAnalytics {
  const learnerId = events[0]?.learnerId ?? learnerStates[0]?.learnerId ?? "";
  const attemptEvents = events.filter((event) => event.eventType === "QUESTION_ATTEMPT" || event.eventType === "QUESTION_CORRECT" || event.eventType === "QUESTION_WRONG");
  const totalAttempts = attemptEvents.length;
  const totalCorrect = attemptEvents.filter((event) => event.isCorrect).length;
  const totalWrong = totalAttempts - totalCorrect;
  const accuracyRate = totalAttempts ? round(totalCorrect / totalAttempts) : 0;
  const stateByFactId = new Map(learnerStates.map((state) => [state.factId, state]));
  const examScoreByFactId = new Map(examScores.map((score) => [score.factId, score]));

  const weakFacts = aggregateByFact(attemptEvents, stateByFactId, examScoreByFactId);
  const weakConcepts = aggregateByKey(attemptEvents, "conceptId", stateByFactId, examScoreByFactId);
  const weakCategories = aggregateByKey(attemptEvents, "categoryId", stateByFactId, examScoreByFactId);
  const lastStudyAt = latestTimestamp(events);
  const studyStreak = calculateStudyStreak(events);
  const estimatedPassProbability = estimatePassProbability(accuracyRate, learnerStates, recentAccuracy(attemptEvents));

  return {
    learnerId,
    totalAttempts,
    totalCorrect,
    totalWrong,
    accuracyRate,
    weakFacts,
    weakConcepts,
    weakCategories,
    studyStreak,
    lastStudyAt,
    estimatedPassProbability
  };
}

export function getAdaptiveRecommendationContext(analytics: LearnerAnalytics, limit = 10): AdaptiveRecommendationContext {
  return {
    weakFacts: analytics.weakFacts.slice(0, limit).map((item) => item.id),
    weakConcepts: analytics.weakConcepts.slice(0, limit).map((item) => item.id),
    recommendedReviewFacts: analytics.weakFacts
      .filter((item) => item.priorityScore >= 0.45)
      .slice(0, limit)
      .map((item) => item.id)
  };
}

function aggregateByFact(
  events: LearningEvent[],
  stateByFactId: Map<string, LearnerKnowledgeState>,
  examScoreByFactId: Map<string, ExamValueScore>
) {
  const byFact = new Map<string, AggregatedMetric>();
  for (const event of events) {
    const current = byFact.get(event.factId) ?? {
      id: event.factId,
      attemptCount: 0,
      wrongCount: 0,
      masteryScores: [],
      examValueScores: []
    };
    const state = stateByFactId.get(event.factId);
    const examScore = examScoreByFactId.get(event.factId);
    current.attemptCount += 1;
    if (!event.isCorrect) current.wrongCount += 1;
    if (state) current.masteryScores.push(state.masteryScore);
    if (examScore) current.examValueScores.push(examScore.overallScore);
    byFact.set(event.factId, current);
  }
  for (const state of stateByFactId.values()) {
    if (state.masteryScore >= 0.45) continue;
    const current = byFact.get(state.factId) ?? {
      id: state.factId,
      attemptCount: state.attemptCount,
      wrongCount: state.wrongCount,
      masteryScores: [],
      examValueScores: []
    };
    current.masteryScores.push(state.masteryScore);
    const examScore = examScoreByFactId.get(state.factId);
    if (examScore) current.examValueScores.push(examScore.overallScore);
    byFact.set(state.factId, current);
  }
  return toWeaknessMetrics(Array.from(byFact.values()));
}

function aggregateByKey(
  events: LearningEvent[],
  key: "conceptId" | "categoryId",
  stateByFactId: Map<string, LearnerKnowledgeState>,
  examScoreByFactId: Map<string, ExamValueScore>
) {
  const grouped = new Map<string, AggregatedMetric>();
  for (const event of events) {
    const id = event[key];
    const current = grouped.get(id) ?? { id, attemptCount: 0, wrongCount: 0, masteryScores: [], examValueScores: [] };
    const state = stateByFactId.get(event.factId);
    const examScore = examScoreByFactId.get(event.factId);
    current.attemptCount += 1;
    if (!event.isCorrect) current.wrongCount += 1;
    if (state) current.masteryScores.push(state.masteryScore);
    if (examScore) current.examValueScores.push(examScore.overallScore);
    grouped.set(id, current);
  }
  return toWeaknessMetrics(Array.from(grouped.values()));
}

function toWeaknessMetrics(metrics: AggregatedMetric[]): WeaknessMetric[] {
  return metrics
    .map((metric) => {
      const wrongRate = metric.attemptCount ? metric.wrongCount / metric.attemptCount : 0;
      const masteryScore = metric.masteryScores.length ? average(metric.masteryScores) : undefined;
      const examValue = metric.examValueScores.length ? average(metric.examValueScores) : 0.5;
      const masteryGap = masteryScore === undefined ? 0.3 : 1 - masteryScore;
      const priorityScore = clamp(round((wrongRate * 0.5) + (masteryGap * 0.35) + (examValue * 0.15)));
      return {
        id: metric.id,
        wrongRate: round(wrongRate),
        attemptCount: metric.attemptCount,
        masteryScore,
        priorityScore
      };
    })
    .filter((metric) => metric.wrongRate > 0 || (metric.masteryScore ?? 1) < 0.5)
    .sort((left, right) => right.priorityScore - left.priorityScore || left.id.localeCompare(right.id));
}

function estimatePassProbability(accuracyRate: number, states: LearnerKnowledgeState[], recent: number) {
  const masteryAverage = states.length ? average(states.map((state) => state.masteryScore)) : 0.5;
  return clamp(round((accuracyRate * 0.45) + (masteryAverage * 0.4) + (recent * 0.15)));
}

function recentAccuracy(events: LearningEvent[]) {
  const recent = [...events].sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()).slice(0, 20);
  if (!recent.length) return 0;
  return recent.filter((event) => event.isCorrect).length / recent.length;
}

function latestTimestamp(events: LearningEvent[]) {
  const latest = events.map((event) => event.timestamp).sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];
  return latest ?? null;
}

function calculateStudyStreak(events: LearningEvent[]) {
  const days = [...new Set(events.map((event) => event.timestamp.slice(0, 10)))].sort().reverse();
  if (!days.length) return 0;
  let streak = 1;
  let cursor = new Date(`${days[0]}T00:00:00.000Z`);
  for (const day of days.slice(1)) {
    cursor = new Date(cursor.getTime() - 86_400_000);
    if (day !== cursor.toISOString().slice(0, 10)) break;
    streak += 1;
  }
  return streak;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
