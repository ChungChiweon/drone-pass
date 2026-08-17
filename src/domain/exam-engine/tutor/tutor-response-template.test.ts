import { describe, expect, it } from "vitest";
import type { ErrorDiagnosis, ErrorType } from "./error-diagnosis";
import type { TutorResponseContext } from "./tutor-response";
import { buildTutorResponseTemplate, selectExplanationStrategy } from "./tutor-response-template";

function diagnosis(errorType: ErrorType): ErrorDiagnosis {
  return {
    learnerId: "learner-1",
    questionId: "Q-1",
    factId: "AF-001",
    conceptId: "C-1",
    errorType,
    errorReason: "reason",
    confusionFacts: ["AF-002"],
    relatedFacts: ["AF-003"],
    recommendedReviewFacts: ["AF-001", "AF-002"],
    confidence: 0.8
  };
}

function context(errorType: ErrorType): TutorResponseContext {
  return {
    learnerId: "learner-1",
    questionId: "Q-1",
    errorDiagnosis: diagnosis(errorType),
    explanationFacts: ["AF-010"],
    relatedFacts: ["AF-002", "AF-003"],
    recommendedReviewFacts: ["AF-001", "AF-002", "AF-010"],
    difficulty: "medium",
    tone: "exam-focused"
  };
}

describe("selectExplanationStrategy", () => {
  it("selects a strategy for each error type", () => {
    expect(selectExplanationStrategy(diagnosis("KNOWLEDGE_GAP"))).toBe("CONCEPT_REVIEW");
    expect(selectExplanationStrategy(diagnosis("CONCEPT_CONFUSION"))).toBe("CONFUSION_CLARIFICATION");
    expect(selectExplanationStrategy(diagnosis("NUMERIC_MISTAKE"))).toBe("NUMERIC_EXPLANATION");
    expect(selectExplanationStrategy(diagnosis("EXCEPTION_MISSED"))).toBe("EXCEPTION_EXPLANATION");
    expect(selectExplanationStrategy(diagnosis("CARELESS_ERROR"))).toBe("QUICK_REMINDER");
  });
});

describe("buildTutorResponseTemplate", () => {
  it("builds a concept review template", () => {
    const template = buildTutorResponseTemplate(context("KNOWLEDGE_GAP"));

    expect(template.title).toContain("개념");
    expect(template.keyPoints.join(" ")).toContain("KNOWLEDGE_GAP");
    expect(template.nextAction).toContain("AF-001");
  });

  it("builds a confusion clarification template with recommended facts", () => {
    const template = buildTutorResponseTemplate(context("CONCEPT_CONFUSION"));

    expect(template.title).toContain("헷갈린");
    expect(template.keyPoints.join(" ")).toContain("AF-002");
    expect(template.relatedFacts).toEqual(["AF-002", "AF-003", "AF-010"]);
  });

  it("builds numeric, exception, and quick reminder templates", () => {
    expect(buildTutorResponseTemplate(context("NUMERIC_MISTAKE")).summary).toContain("숫자");
    expect(buildTutorResponseTemplate(context("EXCEPTION_MISSED")).summary).toContain("예외");
    expect(buildTutorResponseTemplate(context("CARELESS_ERROR")).title).toContain("빠르게");
  });
});
