import { describe, expect, it } from "vitest";
import type { LearnerAnalytics } from "@/domain/exam-engine/analytics/learner-analytics";
import type { LearnerKnowledgeState } from "@/domain/exam-engine/adaptive/learner-state";
import type { AtomicFact, GeneratedQuestion, KnowledgeRelation } from "@/domain/exam-engine/types";
import { createTemplateTutorResponseProvider, runTutorPipeline } from "./tutor-pipeline";

function fact(id: string): AtomicFact {
  return {
    id,
    conceptId: "C-1",
    subject: "subject",
    predicate: "predicate",
    value: "value",
    statement: `${id} statement`,
    conditions: [],
    exceptions: [],
    sourceReferences: [],
    version: "1",
    status: "approved"
  };
}

function question(): GeneratedQuestion {
  return {
    id: "Q-1",
    examId: "exam",
    subjectId: "S-1",
    categoryIds: ["CAT-1"],
    conceptIds: ["C-1"],
    factIds: ["AF-001"],
    templateId: "TPL-1",
    stem: "stem",
    choices: [
      { id: "correct", text: "정답", isCorrect: true, sourceFactIds: ["AF-001"] },
      { id: "wrong", text: "혼동 보기", isCorrect: false, sourceFactIds: ["AF-002"] }
    ],
    explanation: "explanation",
    difficulty: "medium",
    sourceReferences: [],
    generatedAt: "2026-07-27T00:00:00.000Z",
    generationSeed: "seed",
    validationStatus: "valid",
    trace: {
      factId: "AF-001",
      templateId: "TPL-1",
      questionType: "SELECT_TRUE",
      distractorRuleIds: []
    }
  };
}

function relation(): KnowledgeRelation {
  return {
    id: "REL-1",
    packId: "pack-a",
    fromFactId: "AF-001",
    toFactId: "AF-002",
    relationType: "CONFUSED_WITH",
    reason: "confused",
    confidence: 0.9,
    createdAt: "2026-07-27T00:00:00.000Z",
    reviewStatus: "approved"
  };
}

function learnerState(): LearnerKnowledgeState {
  return {
    learnerId: "learner-1",
    packId: "pack-a",
    factId: "AF-001",
    masteryScore: 0.6,
    confidenceScore: 0.5,
    attemptCount: 3,
    correctCount: 1,
    wrongCount: 2,
    wrongPatternTags: [],
    lastReviewedAt: "2026-07-27T00:00:00.000Z",
    nextReviewAt: null,
    learningStatus: "learning"
  };
}

function analytics(): LearnerAnalytics {
  return {
    learnerId: "learner-1",
    totalAttempts: 3,
    totalCorrect: 1,
    totalWrong: 2,
    accuracyRate: 0.33,
    weakFacts: [{ id: "AF-010", wrongRate: 0.8, attemptCount: 5, masteryScore: 0.2, priorityScore: 0.9 }],
    weakConcepts: [],
    weakCategories: [],
    studyStreak: 1,
    lastStudyAt: "2026-07-27T00:00:00.000Z",
    estimatedPassProbability: 0.45
  };
}

describe("runTutorPipeline", () => {
  it("orchestrates diagnosis, strategy, template, and recommendations", () => {
    const result = runTutorPipeline(
      question(),
      { selectedAnswer: "wrong", correctAnswer: "correct" },
      [fact("AF-001"), fact("AF-002"), fact("AF-010")],
      [relation()],
      learnerState(),
      analytics()
    );

    expect(result.diagnosis.errorType).toBe("CONCEPT_CONFUSION");
    expect(result.strategy).toBe("CONFUSION_CLARIFICATION");
    expect(result.responseTemplate.title).toContain("헷갈린");
    expect(result.recommendedNextFacts).toEqual(expect.arrayContaining(["AF-001", "AF-002", "AF-010"]));
  });

  it("supports the static template response provider interface", () => {
    const provider = createTemplateTutorResponseProvider();
    const result = runTutorPipeline(
      question(),
      { selectedAnswer: "wrong", correctAnswer: "correct" },
      [fact("AF-001"), fact("AF-002")],
      [relation()],
      learnerState(),
      analytics(),
      provider
    );

    expect(result.responseTemplate.keyPoints.length).toBeGreaterThan(0);
  });
});
