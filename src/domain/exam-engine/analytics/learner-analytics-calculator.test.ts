import { describe, expect, it } from "vitest";
import type { ExamValueScore } from "@/domain/exam-engine/types";
import type { LearnerKnowledgeState } from "@/domain/exam-engine/adaptive/learner-state";
import type { LearningEvent } from "./learning-event";
import { calculateLearnerAnalytics, getAdaptiveRecommendationContext } from "./learner-analytics-calculator";

function event(overrides: Partial<LearningEvent> = {}): LearningEvent {
  return {
    learnerId: "learner-1",
    eventType: "QUESTION_ATTEMPT",
    questionId: "Q-1",
    factId: "AF-001",
    conceptId: "C-1",
    categoryId: "CAT-1",
    isCorrect: false,
    score: 0,
    difficulty: "medium",
    timestamp: "2026-07-27T00:00:00.000Z",
    ...overrides
  };
}

function state(overrides: Partial<LearnerKnowledgeState> = {}): LearnerKnowledgeState {
  return {
    learnerId: "learner-1",
    packId: "pack-a",
    factId: "AF-001",
    masteryScore: 0.3,
    confidenceScore: 0.4,
    attemptCount: 3,
    correctCount: 1,
    wrongCount: 2,
    wrongPatternTags: [],
    lastReviewedAt: "2026-07-20T00:00:00.000Z",
    nextReviewAt: null,
    learningStatus: "learning",
    ...overrides
  };
}

function examScore(factId: string, overallScore = 0.8): ExamValueScore {
  return {
    packId: "pack-a",
    factId,
    frequencyScore: 0.5,
    confusionScore: 0.5,
    importanceScore: 0.5,
    numericRiskScore: 0.5,
    penaltyRiskScore: 0.5,
    difficultyScore: 0.5,
    overallScore,
    reason: "",
    updatedAt: "2026-07-27T00:00:00.000Z",
    reviewStatus: "draft"
  };
}

describe("calculateLearnerAnalytics", () => {
  it("calculates learner accuracy", () => {
    const analytics = calculateLearnerAnalytics([
      event({ isCorrect: true }),
      event({ questionId: "Q-2", factId: "AF-002", isCorrect: false }),
      event({ questionId: "Q-3", factId: "AF-003", isCorrect: true })
    ], [state()], [examScore("AF-001")]);

    expect(analytics.totalAttempts).toBe(3);
    expect(analytics.totalCorrect).toBe(2);
    expect(analytics.totalWrong).toBe(1);
    expect(analytics.accuracyRate).toBe(0.67);
  });

  it("detects weak facts from high wrong rate and low mastery", () => {
    const analytics = calculateLearnerAnalytics([
      event({ factId: "AF-001", isCorrect: false }),
      event({ questionId: "Q-2", factId: "AF-001", isCorrect: false }),
      event({ questionId: "Q-3", factId: "AF-002", conceptId: "C-2", categoryId: "CAT-2", isCorrect: true })
    ], [
      state({ factId: "AF-001", masteryScore: 0.2 }),
      state({ factId: "AF-002", masteryScore: 0.9 })
    ], [examScore("AF-001", 0.95), examScore("AF-002", 0.4)]);

    expect(analytics.weakFacts[0].id).toBe("AF-001");
    expect(analytics.weakFacts[0].priorityScore).toBeGreaterThanOrEqual(analytics.weakFacts.at(-1)?.priorityScore ?? 0);
  });

  it("aggregates weak concepts and categories", () => {
    const analytics = calculateLearnerAnalytics([
      event({ factId: "AF-001", conceptId: "C-weak", categoryId: "CAT-weak", isCorrect: false }),
      event({ questionId: "Q-2", factId: "AF-002", conceptId: "C-weak", categoryId: "CAT-weak", isCorrect: false }),
      event({ questionId: "Q-3", factId: "AF-003", conceptId: "C-ok", categoryId: "CAT-ok", isCorrect: true })
    ], [
      state({ factId: "AF-001", masteryScore: 0.2 }),
      state({ factId: "AF-002", masteryScore: 0.3 }),
      state({ factId: "AF-003", masteryScore: 0.9 })
    ], [examScore("AF-001"), examScore("AF-002"), examScore("AF-003")]);

    expect(analytics.weakConcepts[0].id).toBe("C-weak");
    expect(analytics.weakCategories[0].id).toBe("CAT-weak");
  });

  it("estimates pass probability from accuracy, mastery, and recent performance", () => {
    const high = calculateLearnerAnalytics([
      event({ isCorrect: true }),
      event({ questionId: "Q-2", factId: "AF-002", isCorrect: true })
    ], [
      state({ factId: "AF-001", masteryScore: 0.9 }),
      state({ factId: "AF-002", masteryScore: 0.85 })
    ], [examScore("AF-001"), examScore("AF-002")]);
    const low = calculateLearnerAnalytics([
      event({ isCorrect: false }),
      event({ questionId: "Q-2", factId: "AF-002", isCorrect: false })
    ], [
      state({ factId: "AF-001", masteryScore: 0.2 }),
      state({ factId: "AF-002", masteryScore: 0.25 })
    ], [examScore("AF-001"), examScore("AF-002")]);

    expect(high.estimatedPassProbability).toBeGreaterThan(low.estimatedPassProbability);
  });

  it("builds adaptive recommendation context", () => {
    const analytics = calculateLearnerAnalytics([
      event({ factId: "AF-001", conceptId: "C-weak", isCorrect: false }),
      event({ questionId: "Q-2", factId: "AF-002", conceptId: "C-weak", isCorrect: false })
    ], [
      state({ factId: "AF-001", masteryScore: 0.2 }),
      state({ factId: "AF-002", masteryScore: 0.25 })
    ], [examScore("AF-001"), examScore("AF-002")]);

    const context = getAdaptiveRecommendationContext(analytics, 2);

    expect(context.weakFacts).toEqual(["AF-001", "AF-002"]);
    expect(context.weakConcepts).toEqual(["C-weak"]);
    expect(context.recommendedReviewFacts).toEqual(["AF-001", "AF-002"]);
  });
});
