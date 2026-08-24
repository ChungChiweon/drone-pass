import { describe, expect, it } from "vitest";
import type { AtomicFact, ExamValueScore, KnowledgeRelation } from "@/domain/exam-engine/types";
import {
  buildQuestionGenerationContext,
  createStaticQuestionContextProvider
} from "./question-generation-context-builder";

function fact(overrides: Partial<AtomicFact> = {}): AtomicFact {
  return {
    id: "AF-001",
    conceptId: "C-1",
    subject: "subject",
    predicate: "predicate",
    value: "value",
    statement: "statement",
    conditions: [],
    exceptions: [],
    sourceReferences: [],
    version: "1",
    status: "draft",
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
    reason: "confusable",
    confidence: 0.95,
    createdAt: "2026-07-27T00:00:00.000Z",
    reviewStatus: "draft",
    ...overrides
  };
}

function score(overrides: Partial<ExamValueScore> = {}): ExamValueScore {
  return {
    packId: "pack-a",
    factId: "AF-001",
    frequencyScore: 0.5,
    confusionScore: 0.8,
    importanceScore: 0.8,
    numericRiskScore: 0.4,
    penaltyRiskScore: 0.1,
    difficultyScore: 0.8,
    overallScore: 0.76,
    reason: "reason",
    updatedAt: "2026-07-27T00:00:00.000Z",
    reviewStatus: "draft",
    ...overrides
  };
}

describe("buildQuestionGenerationContext", () => {
  it("builds context from graph relations", () => {
    const context = buildQuestionGenerationContext("AF-001", [
      fact({ id: "AF-001" }),
      fact({ id: "AF-002" }),
      fact({ id: "AF-003" }),
      fact({ id: "AF-004" })
    ], [
      relation({ id: "REL-1", relationType: "RELATED", toFactId: "AF-002" }),
      relation({ id: "REL-2", relationType: "CONFUSED_WITH", toFactId: "AF-003" }),
      relation({ id: "REL-3", relationType: "EXCEPTION_OF", toFactId: "AF-004" })
    ], [score()]);

    expect(context).toMatchObject({
      targetFactId: "AF-001",
      relatedFactIds: ["AF-002"],
      confusionFactIds: ["AF-003"],
      exceptionFactIds: ["AF-004"],
      difficulty: "hard"
    });
  });

  it("puts CONFUSED_WITH and COMPARISON_PAIR into allowed distractors", () => {
    const context = buildQuestionGenerationContext("AF-001", [
      fact({ id: "AF-001", value: 10 }),
      fact({ id: "AF-002" }),
      fact({ id: "AF-003" })
    ], [
      relation({ id: "REL-1", relationType: "CONFUSED_WITH", toFactId: "AF-002" }),
      relation({ id: "REL-2", relationType: "COMPARISON_PAIR", toFactId: "AF-003" })
    ]);

    expect(context?.allowedDistractorFactIds).toEqual(["AF-002", "AF-003"]);
    expect(context?.comparisonFactIds).toEqual(["AF-003"]);
    expect(context?.questionType).toBe("CONCEPT_COMPARISON");
  });

  it("excludes rejected relation targets from allowed distractors", () => {
    const context = buildQuestionGenerationContext("AF-001", [
      fact({ id: "AF-001" }),
      fact({ id: "AF-002" })
    ], [
      relation({ relationType: "CONFUSED_WITH", toFactId: "AF-002", reviewStatus: "rejected" })
    ]);

    expect(context?.allowedDistractorFactIds).toEqual([]);
    expect(context?.forbiddenDistractorFactIds).toEqual(["AF-002"]);
  });

  it("falls back safely when graph data is absent", () => {
    const context = buildQuestionGenerationContext("AF-001", [fact({ id: "AF-001" })], [], []);

    expect(context).toEqual({
      targetFactId: "AF-001",
      relatedFactIds: [],
      confusionFactIds: [],
      prerequisiteFactIds: [],
      exceptionFactIds: [],
      comparisonFactIds: [],
      difficulty: "medium",
      questionType: "SELECT_TRUE",
      allowedDistractorFactIds: [],
      forbiddenDistractorFactIds: []
    });
    expect(buildQuestionGenerationContext("AF-999", [fact({ id: "AF-001" })], [], [])).toBeNull();
  });

  it("provides a compiler-ready adapter interface without invoking the compiler", () => {
    const provider = createStaticQuestionContextProvider([fact({ id: "AF-001" })], [], []);

    expect(provider.getContext("AF-001")?.targetFactId).toBe("AF-001");
    expect(provider.getContext("AF-999")).toBeNull();
  });
});
