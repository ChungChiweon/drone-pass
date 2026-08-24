import { describe, expect, it } from "vitest";
import { compileQuestion } from "@/domain/exam-engine/compiler/question-compiler";
import type { AtomicFact, Concept, DistractorRule, KnowledgeRelation, QuestionGenerationContext, QuestionTemplate } from "@/domain/exam-engine/types";
import { buildGraphDistractorCandidates } from "./graph-distractor-strategy";
import { enhanceQuestionContext } from "./graph-question-enhancer";
import { generateGraphEnhancedQuestion } from "./graph-enhanced-question-generator";
import { selectQuestionTypeHint } from "./question-type-selector";

const categoriesByConceptId = { "C-1": ["CAT-1"], "C-2": ["CAT-2"] };
const conceptsById: Record<string, Concept> = {
  "C-1": { id: "C-1", subjectId: "S-1", categoryIds: ["CAT-1"], title: "One", summary: "" },
  "C-2": { id: "C-2", subjectId: "S-1", categoryIds: ["CAT-2"], title: "Two", summary: "" }
};
const template: QuestionTemplate = { id: "TPL", questionType: "SELECT_TRUE", stemTemplate: "{statement}", explanationTemplate: "{statement}", difficulty: "medium" };
const distractorRules: DistractorRule[] = [];

function fact(overrides: Partial<AtomicFact> = {}): AtomicFact {
  return {
    id: "AF-001",
    conceptId: "C-1",
    subject: "subject",
    predicate: "predicate",
    value: "value",
    statement: "target statement.",
    conditions: [],
    exceptions: [],
    sourceReferences: [],
    version: "1",
    status: "approved",
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
    reason: "approved graph",
    confidence: 0.95,
    createdAt: "2026-07-28T00:00:00.000Z",
    reviewStatus: "approved",
    ...overrides
  };
}

function context(overrides: Partial<QuestionGenerationContext> = {}): QuestionGenerationContext {
  return {
    targetFactId: "AF-001",
    relatedFactIds: [],
    confusionFactIds: [],
    prerequisiteFactIds: [],
    exceptionFactIds: [],
    comparisonFactIds: [],
    difficulty: "medium",
    questionType: "SELECT_TRUE",
    allowedDistractorFactIds: [],
    forbiddenDistractorFactIds: [],
    ...overrides
  };
}

function facts() {
  return [
    fact({ id: "AF-001", statement: "target statement." }),
    fact({ id: "AF-002", conceptId: "C-2", statement: "confusion statement." }),
    fact({ id: "AF-003", conceptId: "C-2", statement: "comparison statement." }),
    fact({ id: "AF-004", conceptId: "C-2", statement: "fallback statement." }),
    fact({ id: "AF-005", conceptId: "C-2", statement: "another fallback statement." })
  ];
}

describe("graph question enhancement", () => {
  it("enhances context with approved relations only", () => {
    const enhanced = enhanceQuestionContext(context(), [
      relation({ toFactId: "AF-002", relationType: "CONFUSED_WITH", reviewStatus: "approved" }),
      relation({ toFactId: "AF-003", relationType: "EXCEPTION_OF", reviewStatus: "draft" }),
      relation({ toFactId: "AF-004", relationType: "COMPARISON_PAIR", reviewStatus: "rejected" })
    ], "AF-001");

    expect(enhanced.approvedConfusionFacts).toEqual(["AF-002"]);
    expect(enhanced.approvedExceptionFacts).toEqual([]);
    expect(enhanced.approvedComparisonFacts).toEqual([]);
    expect(enhanced.allowedDistractorFactIds).toEqual(["AF-002"]);
  });

  it("builds distractor candidates by approved graph priority", () => {
    const candidates = buildGraphDistractorCandidates(fact({ id: "AF-001" }), [
      relation({ id: "REL-related", toFactId: "AF-004", relationType: "RELATED" }),
      relation({ id: "REL-draft", toFactId: "AF-005", relationType: "CONFUSED_WITH", reviewStatus: "draft" }),
      relation({ id: "REL-confused", toFactId: "AF-002", relationType: "CONFUSED_WITH" }),
      relation({ id: "REL-comparison", toFactId: "AF-003", relationType: "COMPARISON_PAIR" }),
      relation({ id: "REL-missing", toFactId: "AF-999", relationType: "CONFUSED_WITH" })
    ], facts());

    expect(candidates.map((candidate) => candidate.fact.id)).toEqual(["AF-002", "AF-003", "AF-004"]);
    expect(candidates[0].priority).toBeGreaterThan(candidates[1].priority);
  });

  it("suggests specialized question types from approved relations", () => {
    expect(selectQuestionTypeHint("AF-001", [relation({ relationType: "EXCEPTION_OF" })])).toMatchObject({
      suggestedQuestionType: "CASE_JUDGMENT",
      relationType: "EXCEPTION_OF"
    });
    expect(selectQuestionTypeHint("AF-001", [relation({ relationType: "CONFUSED_WITH" })])).toMatchObject({
      suggestedQuestionType: "CONCEPT_COMPARISON",
      relationType: "CONFUSED_WITH"
    });
  });

  it("ignores draft and rejected relations in type hints", () => {
    expect(selectQuestionTypeHint("AF-001", [
      relation({ relationType: "EXCEPTION_OF", reviewStatus: "draft" }),
      relation({ relationType: "CONFUSED_WITH", reviewStatus: "rejected" })
    ])).toMatchObject({
      suggestedQuestionType: "SELECT_TRUE",
      relationType: null
    });
  });

  it("keeps the existing compiler path unchanged when using compileQuestion directly", () => {
    const input = {
      examId: "exam",
      subjectId: "S-1",
      categoriesByConceptId,
      conceptsById,
      facts: facts(),
      fact: facts()[0],
      template,
      distractorRules,
      seed: "seed"
    };

    expect(compileQuestion(input)?.choices.map((choice) => choice.text)).toEqual(compileQuestion(input)?.choices.map((choice) => choice.text));
  });

  it("passes approved graph context through the adapter without replacing the compiler", () => {
    const result = generateGraphEnhancedQuestion({
      factId: "AF-001",
      examId: "exam",
      subjectId: "S-1",
      categoriesByConceptId,
      conceptsById,
      facts: facts(),
      template,
      distractorRules,
      seed: "seed",
      productionGraph: [
        relation({ toFactId: "AF-002", relationType: "CONFUSED_WITH" }),
        relation({ toFactId: "AF-003", relationType: "COMPARISON_PAIR" })
      ],
      scores: []
    });

    expect(result.hint).toMatchObject({ relationType: "CONFUSED_WITH" });
    expect(result.question?.trace.factId).toBe("AF-001");
    expect(new Set(result.question?.choices.flatMap((choice) => choice.sourceFactIds))).toContain("AF-002");
  });
});
