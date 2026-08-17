import { describe, expect, it } from "vitest";
import type { AtomicFact, ExamValueScore, GeneratedQuestion, KnowledgeRelation, QuestionGenerationContext } from "@/domain/exam-engine/types";
import { benchmarkQuestions, scoreQuestionQuality } from "./question-quality-scorer";

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
    sourceReferences: [{ documentId: "law", locator: "제1조" }],
    confidence: 0.9,
    version: "1",
    status: "approved",
    ...overrides
  };
}

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
      { id: "C-1", text: "correct", isCorrect: true, sourceFactIds: ["AF-001"] },
      { id: "C-2", text: "graph distractor", isCorrect: false, sourceFactIds: ["AF-002"], mutationType: "SIBLING_FACT_SWAP" },
      { id: "C-3", text: "comparison distractor", isCorrect: false, sourceFactIds: ["AF-003"], mutationType: "SIBLING_FACT_SWAP" },
      { id: "C-4", text: "rule distractor", isCorrect: false, sourceFactIds: ["AF-004"], mutationType: "NUMERIC_NEARBY" }
    ],
    explanation: "explanation",
    difficulty: "hard",
    sourceReferences: [{ documentId: "law", locator: "제1조" }],
    generatedAt: "2026-07-27T00:00:00.000Z",
    generationSeed: "seed",
    validationStatus: "valid",
    trace: {
      factId: "AF-001",
      templateId: "TPL-1",
      questionType: "SELECT_TRUE",
      distractorRuleIds: ["SIBLING_FACT_SWAP"]
    },
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
    reviewStatus: "approved",
    ...overrides
  };
}

function context(overrides: Partial<QuestionGenerationContext> = {}): QuestionGenerationContext {
  return {
    targetFactId: "AF-001",
    relatedFactIds: [],
    confusionFactIds: ["AF-002"],
    prerequisiteFactIds: [],
    exceptionFactIds: [],
    comparisonFactIds: ["AF-003"],
    difficulty: "hard",
    questionType: "SELECT_TRUE",
    allowedDistractorFactIds: ["AF-002", "AF-003"],
    forbiddenDistractorFactIds: [],
    ...overrides
  };
}

function examScore(overrides: Partial<ExamValueScore> = {}): ExamValueScore {
  return {
    packId: "pack-a",
    factId: "AF-001",
    frequencyScore: 0.5,
    confusionScore: 0.8,
    importanceScore: 0.9,
    numericRiskScore: 0.6,
    penaltyRiskScore: 0.1,
    difficultyScore: 0.8,
    overallScore: 0.8,
    reason: "hard",
    updatedAt: "2026-07-27T00:00:00.000Z",
    reviewStatus: "draft",
    ...overrides
  };
}

describe("scoreQuestionQuality", () => {
  it("raises scores when source references exist", () => {
    const withSource = scoreQuestionQuality(question(), fact(), context(), [], examScore());
    const withoutSource = scoreQuestionQuality(question({ sourceReferences: [] }), fact({ sourceReferences: [], confidence: 0.9 }), context(), [], examScore());

    expect(withSource.factAccuracyScore).toBeGreaterThan(withoutSource.factAccuracyScore);
    expect(withSource.legalConfidenceScore).toBeGreaterThan(withoutSource.legalConfidenceScore);
  });

  it("raises distractor and graph usage scores for graph-backed distractors", () => {
    const graphBacked = scoreQuestionQuality(question(), fact(), context(), [
      relation({ toFactId: "AF-002" }),
      relation({ id: "REL-2", toFactId: "AF-003", relationType: "COMPARISON_PAIR" })
    ], examScore());
    const randomish = scoreQuestionQuality(question({
      choices: [
        { id: "C-1", text: "correct", isCorrect: true, sourceFactIds: ["AF-001"] },
        { id: "C-2", text: "random 1", isCorrect: false, sourceFactIds: [] },
        { id: "C-3", text: "random 2", isCorrect: false, sourceFactIds: [] },
        { id: "C-4", text: "random 3", isCorrect: false, sourceFactIds: [] }
      ]
    }), fact(), context(), [], examScore());

    expect(graphBacked.distractorQualityScore).toBeGreaterThan(randomish.distractorQualityScore);
    expect(graphBacked.graphUsageScore).toBeGreaterThan(randomish.graphUsageScore);
  });

  it("lowers legal confidence for low confidence facts", () => {
    const high = scoreQuestionQuality(question(), fact({ confidence: 0.95 }), context(), [], examScore());
    const low = scoreQuestionQuality(question(), fact({ confidence: 0.2 }), context(), [], examScore());

    expect(low.legalConfidenceScore).toBeLessThan(high.legalConfidenceScore);
  });
});

describe("benchmarkQuestions", () => {
  it("raises duplication risk for duplicate question patterns", () => {
    const duplicate = question({ id: "Q-2" });
    const unique = question({ id: "Q-3", templateId: "TPL-2", trace: { ...question().trace, templateId: "TPL-2" } });

    const result = benchmarkQuestions([question(), duplicate, unique], [fact(), fact({ id: "AF-002" }), fact({ id: "AF-003" })], [
      relation({ toFactId: "AF-002" }),
      relation({ id: "REL-2", toFactId: "AF-003", relationType: "COMPARISON_PAIR" })
    ], [examScore()]);

    const duplicated = result.scores.filter((score) => score.questionId === "Q-1" || score.questionId === "Q-2");
    expect(duplicated.every((score) => score.duplicationRiskScore >= 0.7)).toBe(true);
    expect(result.averageScore).toBeGreaterThan(0);
    expect(result.improvementNeeded.length).toBeGreaterThan(0);
  });

  it("does not mutate existing compiler inputs", () => {
    const facts = [fact(), fact({ id: "AF-002" })];
    const questions = [question()];
    const snapshot = JSON.stringify({ facts, questions });

    benchmarkQuestions(questions, facts, [relation()], [examScore()]);

    expect(JSON.stringify({ facts, questions })).toBe(snapshot);
  });
});
