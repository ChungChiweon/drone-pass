import { describe, expect, it } from "vitest";
import type { ExamValueScore } from "@/domain/exam-engine/types";
import type { LearnerKnowledgeState } from "./learner-state";
import { calculateAdaptivePriority } from "./adaptive-scorer";
import { selectAdaptiveFacts } from "./adaptive-selection";

const now = new Date("2026-07-27T00:00:00.000Z");

function state(overrides: Partial<LearnerKnowledgeState> = {}): LearnerKnowledgeState {
  return {
    learnerId: "learner-1",
    packId: "pack-a",
    factId: "AF-001",
    masteryScore: 0.5,
    confidenceScore: 0.5,
    attemptCount: 4,
    correctCount: 2,
    wrongCount: 2,
    wrongPatternTags: [],
    lastReviewedAt: "2026-07-20T00:00:00.000Z",
    nextReviewAt: null,
    learningStatus: "learning",
    ...overrides
  };
}

function examScore(factId: string, overallScore: number): ExamValueScore {
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

describe("calculateAdaptivePriority", () => {
  it("raises priority as wrong count increases", () => {
    const lowWrong = calculateAdaptivePriority(state({ attemptCount: 4, correctCount: 4, wrongCount: 0 }), examScore("AF-001", 0.5), undefined, { now });
    const highWrong = calculateAdaptivePriority(state({ attemptCount: 4, correctCount: 1, wrongCount: 3 }), examScore("AF-001", 0.5), undefined, { now });

    expect(highWrong.priorityScore).toBeGreaterThan(lowWrong.priorityScore);
  });

  it("prioritizes low mastery facts", () => {
    const mastered = calculateAdaptivePriority(state({ masteryScore: 0.9 }), examScore("AF-001", 0.5), undefined, { now });
    const weak = calculateAdaptivePriority(state({ masteryScore: 0.1 }), examScore("AF-001", 0.5), undefined, { now });

    expect(weak.priorityScore).toBeGreaterThan(mastered.priorityScore);
  });

  it("raises priority for high ExamValueScore facts", () => {
    const lowValue = calculateAdaptivePriority(state(), examScore("AF-001", 0.1), undefined, { now });
    const highValue = calculateAdaptivePriority(state(), examScore("AF-001", 0.95), undefined, { now });

    expect(highValue.priorityScore).toBeGreaterThan(lowValue.priorityScore);
  });

  it("reduces priority for recently mastered facts", () => {
    const reviewNeeded = calculateAdaptivePriority(state({ learningStatus: "review_needed", masteryScore: 0.8, lastReviewedAt: "2026-06-01T00:00:00.000Z" }), examScore("AF-001", 0.8), undefined, { now });
    const mastered = calculateAdaptivePriority(state({ learningStatus: "mastered", masteryScore: 0.95, correctCount: 10, wrongCount: 0, attemptCount: 10, lastReviewedAt: "2026-07-26T00:00:00.000Z" }), examScore("AF-001", 0.8), undefined, { now });

    expect(mastered.priorityScore).toBeLessThan(reviewNeeded.priorityScore);
  });

  it("raises priority for facts not reviewed for a long time", () => {
    const recent = calculateAdaptivePriority(state({ lastReviewedAt: "2026-07-26T00:00:00.000Z" }), examScore("AF-001", 0.5), undefined, { now });
    const stale = calculateAdaptivePriority(state({ lastReviewedAt: "2026-06-01T00:00:00.000Z" }), examScore("AF-001", 0.5), undefined, { now });

    expect(stale.priorityScore).toBeGreaterThan(recent.priorityScore);
  });
});

describe("selectAdaptiveFacts", () => {
  it("returns next recommended facts sorted by adaptive priority", () => {
    const result = selectAdaptiveFacts([
      state({ factId: "AF-LOW", masteryScore: 0.9, wrongCount: 0, correctCount: 5, attemptCount: 5, learningStatus: "mastered" }),
      state({ factId: "AF-HIGH", masteryScore: 0.1, wrongCount: 4, correctCount: 0, attemptCount: 4, learningStatus: "review_needed" }),
      state({ factId: "AF-MID", masteryScore: 0.5 })
    ], [
      examScore("AF-LOW", 0.2),
      examScore("AF-HIGH", 0.95),
      examScore("AF-MID", 0.5)
    ], 2);

    expect(result.map((item) => item.factId)).toEqual(["AF-HIGH", "AF-MID"]);
  });
});
