import { describe, expect, it } from "vitest";
import type { ExamValueScore, GeneratedQuestion } from "@/domain/exam-engine/types";
import type { QuestionQualityScore } from "@/domain/exam-engine/evaluation/question-quality";
import type { ExamBlueprint } from "./exam-selection";
import { selectExamQuestions } from "./exam-selection-engine";

const blueprint: ExamBlueprint = {
  id: "test-40",
  title: "Test 40",
  examSize: 40,
  categoryDistribution: [
    { categoryId: "CAT-A", ratio: 0.25 },
    { categoryId: "CAT-B", ratio: 0.25 },
    { categoryId: "CAT-C", ratio: 0.25 },
    { categoryId: "CAT-D", ratio: 0.25 }
  ],
  difficultyDistribution: {
    easy: 0.3,
    medium: 0.5,
    hard: 0.2
  },
  newQuestionRatio: 0.25,
  reviewRatio: 0.75,
  maxConceptRepeat: 5,
  maxFactRepeat: 1,
  minQualityScore: 0.65
};

function question(index: number, overrides: Partial<GeneratedQuestion> = {}): GeneratedQuestion {
  const category = ["CAT-A", "CAT-B", "CAT-C", "CAT-D"][index % 4];
  const difficulty = index % 10 < 3 ? "easy" : index % 10 < 8 ? "medium" : "hard";
  const factId = `AF-${String(index + 1).padStart(3, "0")}`;
  return {
    id: `Q-${String(index + 1).padStart(3, "0")}`,
    examId: "exam",
    subjectId: "S-1",
    categoryIds: [category],
    conceptIds: [`C-${String(Math.floor(index / 4)).padStart(2, "0")}`],
    factIds: [factId],
    templateId: "TPL-1",
    stem: `Question ${index}`,
    choices: [],
    explanation: "",
    difficulty,
    sourceReferences: [],
    generatedAt: "2026-07-27T00:00:00.000Z",
    generationSeed: "seed",
    validationStatus: "valid",
    trace: {
      factId,
      templateId: "TPL-1",
      questionType: "SELECT_TRUE",
      distractorRuleIds: []
    },
    ...overrides
  };
}

function quality(questionId: string, factId: string, overrides: Partial<QuestionQualityScore> = {}): QuestionQualityScore {
  return {
    questionId,
    factId,
    factAccuracyScore: 0.9,
    distractorQualityScore: 0.8,
    difficultyFitScore: 0.8,
    duplicationRiskScore: 0.2,
    legalConfidenceScore: 0.9,
    graphUsageScore: 0.6,
    overallScore: 0.8,
    reviewStatus: "approved",
    ...overrides
  };
}

function examValue(factId: string, overallScore = 0.8): ExamValueScore {
  return {
    packId: "pack-a",
    factId,
    frequencyScore: 0.5,
    confusionScore: 0.8,
    importanceScore: 0.9,
    numericRiskScore: 0.6,
    penaltyRiskScore: 0.2,
    difficultyScore: 0.6,
    overallScore,
    reason: "",
    updatedAt: "2026-07-27T00:00:00.000Z",
    reviewStatus: "draft"
  };
}

function fixture(count = 80) {
  const questions = Array.from({ length: count }, (_, index) => question(index));
  const qualities = questions.map((item, index) => quality(item.id, item.trace.factId, { overallScore: 0.95 - (index * 0.002) }));
  const values = questions.map((item, index) => examValue(item.trace.factId, 0.9 - (index * 0.001)));
  return { questions, qualities, values };
}

describe("selectExamQuestions", () => {
  it("selects 40 questions when enough eligible candidates exist", () => {
    const { questions, qualities, values } = fixture();

    const result = selectExamQuestions(questions, blueprint, qualities, values);

    expect(result.totalCount).toBe(40);
    expect(result.questions).toHaveLength(40);
    expect(result.averageQualityScore).toBeGreaterThan(0.65);
    expect(result.averageExamValueScore).toBeGreaterThan(0);
  });

  it("keeps category and difficulty balance near blueprint targets", () => {
    const { questions, qualities, values } = fixture();

    const result = selectExamQuestions(questions, blueprint, qualities, values);

    expect(result.categoryBalance["CAT-A"].actual).toBe(10);
    expect(result.categoryBalance["CAT-B"].actual).toBe(10);
    expect(result.categoryBalance["CAT-C"].actual).toBe(10);
    expect(result.categoryBalance["CAT-D"].actual).toBe(10);
    expect(result.difficultyBalance.easy.actual).toBe(12);
    expect(result.difficultyBalance.medium.actual).toBe(20);
    expect(result.difficultyBalance.hard.actual).toBe(8);
  });

  it("blocks duplicate facts and respects concept repeat limits", () => {
    const { questions, qualities, values } = fixture(50);
    const duplicateQuestion = question(200, { id: "Q-DUP", trace: { ...question(0).trace }, factIds: [question(0).trace.factId] });

    const result = selectExamQuestions([...questions, duplicateQuestion], { ...blueprint, maxConceptRepeat: 3 }, [
      ...qualities,
      quality("Q-DUP", question(0).trace.factId, { overallScore: 1 })
    ], values);

    expect(new Set(result.questions.map((item) => item.factId)).size).toBe(result.questions.length);
    expect(result.duplicateWarnings).toEqual([]);
    expect(Math.max(...Object.values(result.questions.reduce<Record<string, number>>((acc, item) => {
      acc[item.conceptId] = (acc[item.conceptId] ?? 0) + 1;
      return acc;
    }, {})))).toBeLessThanOrEqual(3);
  });

  it("excludes low quality and rejected questions", () => {
    const { questions, qualities, values } = fixture(45);
    const lowQuestion = question(500, { id: "Q-LOW", categoryIds: ["CAT-A"], conceptIds: ["C-low"], trace: { ...question(500).trace, factId: "AF-LOW" }, factIds: ["AF-LOW"] });
    const rejectedQuestion = question(501, { id: "Q-REJECTED", categoryIds: ["CAT-A"], conceptIds: ["C-rejected"], trace: { ...question(501).trace, factId: "AF-REJECTED" }, factIds: ["AF-REJECTED"] });

    const result = selectExamQuestions([...questions, lowQuestion, rejectedQuestion], blueprint, [
      ...qualities,
      quality("Q-LOW", "AF-LOW", { overallScore: 0.2 }),
      quality("Q-REJECTED", "AF-REJECTED", { reviewStatus: "rejected", overallScore: 1 })
    ], [...values, examValue("AF-LOW", 1), examValue("AF-REJECTED", 1)]);

    expect(result.questions.map((item) => item.questionId)).not.toContain("Q-LOW");
    expect(result.questions.map((item) => item.questionId)).not.toContain("Q-REJECTED");
  });

  it("responds to blueprint changes", () => {
    const { questions, qualities, values } = fixture();

    const result = selectExamQuestions(questions, { ...blueprint, examSize: 20, difficultyDistribution: { easy: 0.5, medium: 0.3, hard: 0.2 } }, qualities, values);

    expect(result.totalCount).toBe(20);
    expect(result.difficultyBalance.easy.actual).toBe(10);
    expect(result.difficultyBalance.medium.actual).toBe(6);
    expect(result.difficultyBalance.hard.actual).toBe(4);
  });
});
