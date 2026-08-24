import { describe, expect, it } from "vitest";
import type { GeneratedQuestion, KnowledgeRelation, QuestionGenerationContext } from "@/domain/exam-engine/types";
import type { LearnerKnowledgeState } from "@/domain/exam-engine/adaptive/learner-state";
import type { LearnerAnalytics } from "@/domain/exam-engine/analytics/learner-analytics";
import { diagnoseError } from "./error-diagnosis-engine";
import { buildTutorLearningContext } from "./tutor-context-builder";

function question(overrides: Partial<GeneratedQuestion> = {}): GeneratedQuestion {
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
      { id: "correct", text: "30일 이내", isCorrect: true, sourceFactIds: ["AF-001"] },
      { id: "confused", text: "15일 이내", isCorrect: false, sourceFactIds: ["AF-002"] },
      { id: "exception", text: "신고 예외", isCorrect: false, sourceFactIds: ["AF-003"] },
      { id: "other", text: "그 밖의 보기", isCorrect: false, sourceFactIds: ["AF-004"] }
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
    },
    ...overrides
  };
}

function context(overrides: Partial<QuestionGenerationContext> = {}): QuestionGenerationContext {
  return {
    targetFactId: "AF-001",
    relatedFactIds: ["AF-004"],
    confusionFactIds: ["AF-002"],
    prerequisiteFactIds: ["AF-005"],
    exceptionFactIds: ["AF-003"],
    comparisonFactIds: [],
    difficulty: "medium",
    questionType: "SELECT_TRUE",
    allowedDistractorFactIds: ["AF-002"],
    forbiddenDistractorFactIds: [],
    ...overrides
  };
}

function state(overrides: Partial<LearnerKnowledgeState> = {}): LearnerKnowledgeState {
  return {
    learnerId: "learner-1",
    packId: "pack-a",
    factId: "AF-001",
    masteryScore: 0.8,
    confidenceScore: 0.8,
    attemptCount: 5,
    correctCount: 4,
    wrongCount: 1,
    wrongPatternTags: [],
    lastReviewedAt: "2026-07-27T00:00:00.000Z",
    nextReviewAt: null,
    learningStatus: "learning",
    ...overrides
  };
}

function relation(overrides: Partial<KnowledgeRelation> = {}): KnowledgeRelation {
  return {
    id: "REL-1",
    packId: "pack-a",
    fromFactId: "AF-001",
    toFactId: "AF-002",
    relationType: "CONFUSED_WITH",
    reason: "confused",
    confidence: 0.9,
    createdAt: "2026-07-27T00:00:00.000Z",
    reviewStatus: "approved",
    ...overrides
  };
}

function analytics(): LearnerAnalytics {
  return {
    learnerId: "learner-1",
    totalAttempts: 5,
    totalCorrect: 3,
    totalWrong: 2,
    accuracyRate: 0.6,
    weakFacts: [{ id: "AF-010", wrongRate: 0.8, attemptCount: 5, masteryScore: 0.2, priorityScore: 0.9 }],
    weakConcepts: [{ id: "C-weak", wrongRate: 0.7, attemptCount: 4, masteryScore: 0.3, priorityScore: 0.8 }],
    weakCategories: [],
    studyStreak: 2,
    lastStudyAt: "2026-07-27T00:00:00.000Z",
    estimatedPassProbability: 0.55
  };
}

describe("diagnoseError", () => {
  it("detects concept confusion from CONFUSED_WITH facts", () => {
    const diagnosis = diagnoseError(question({ choices: [
      { id: "correct", text: "정답", isCorrect: true, sourceFactIds: ["AF-001"] },
      { id: "confused", text: "혼동 보기", isCorrect: false, sourceFactIds: ["AF-002"] }
    ] }), "confused", "correct", context(), state());

    expect(diagnosis.errorType).toBe("CONCEPT_CONFUSION");
    expect(diagnosis.confusionFacts).toEqual(["AF-002"]);
  });

  it("detects numeric mistakes from selected and correct answer values", () => {
    const diagnosis = diagnoseError(question(), "confused", "correct", context(), state());

    expect(diagnosis.errorType).toBe("NUMERIC_MISTAKE");
  });

  it("detects missed exceptions from exception relation facts", () => {
    const diagnosis = diagnoseError(question(), "exception", "correct", context(), state());

    expect(diagnosis.errorType).toBe("EXCEPTION_MISSED");
    expect(diagnosis.recommendedReviewFacts).toContain("AF-003");
  });

  it("detects knowledge gap when mastery is low", () => {
    const diagnosis = diagnoseError(question({ choices: [
      { id: "correct", text: "정답", isCorrect: true, sourceFactIds: ["AF-001"] },
      { id: "other", text: "기타 보기", isCorrect: false, sourceFactIds: ["AF-004"] }
    ] }), "other", "correct", context({ confusionFactIds: [], exceptionFactIds: [] }), state({ masteryScore: 0.2 }));

    expect(diagnosis.errorType).toBe("KNOWLEDGE_GAP");
  });
});

describe("buildTutorLearningContext", () => {
  it("builds recommended facts from diagnosis, weak facts, and graph relations", () => {
    const diagnosis = diagnoseError(question({ choices: [
      { id: "correct", text: "정답", isCorrect: true, sourceFactIds: ["AF-001"] },
      { id: "confused", text: "혼동 보기", isCorrect: false, sourceFactIds: ["AF-002"] }
    ] }), "confused", "correct", context(), state());

    const tutorContext = buildTutorLearningContext(diagnosis, analytics(), [
      relation(),
      relation({ id: "REL-2", toFactId: "AF-020", relationType: "RELATED" })
    ]);

    expect(tutorContext.graphRelations).toHaveLength(2);
    expect(tutorContext.relatedFacts).toEqual(expect.arrayContaining(["AF-002", "AF-020"]));
    expect(tutorContext.recommendedNextFacts).toEqual(expect.arrayContaining(["AF-001", "AF-002", "AF-010"]));
  });
});
