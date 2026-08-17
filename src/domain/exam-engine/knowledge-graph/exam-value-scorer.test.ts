import { describe, expect, it } from "vitest";
import type { AtomicFact, KnowledgeRelation } from "@/domain/exam-engine/types";
import { scoreFactsForExam } from "./exam-value-scorer";

function fact(overrides: Partial<AtomicFact> = {}): AtomicFact {
  return {
    id: "AF-001",
    conceptId: "C-1",
    subject: "subject",
    predicate: "신고",
    value: "value",
    statement: "신고를 하여야 한다.",
    conditions: [],
    exceptions: [],
    sourceReferences: [{ documentId: "law", locator: "제1조" }],
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
    confidence: 1,
    createdAt: "2026-07-27T00:00:00.000Z",
    reviewStatus: "draft",
    ...overrides
  };
}

describe("scoreFactsForExam", () => {
  it("raises confusion score for confusable and comparison relations", () => {
    const [score] = scoreFactsForExam([fact()], [
      relation({ relationType: "CONFUSED_WITH" }),
      relation({ id: "REL-2", relationType: "COMPARISON_PAIR" })
    ], { packId: "pack-a" });

    expect(score.confusionScore).toBeGreaterThan(0.5);
    expect(score.reviewStatus).toBe("draft");
  });

  it("raises numeric risk for numeric values and units", () => {
    const [numeric] = scoreFactsForExam([fact({ value: 25, unit: "kg", statement: "25kg 이상이어야 한다." })]);
    const [plain] = scoreFactsForExam([fact({ id: "AF-002", value: "대상", unit: undefined, statement: "대상이다." })]);

    expect(numeric.numericRiskScore).toBeGreaterThan(plain.numericRiskScore);
  });

  it("raises penalty risk for penalty facts", () => {
    const [penalty] = scoreFactsForExam([fact({ predicate: "과태료", statement: "위반 시 과태료 100만원을 부과한다." })]);
    const [normal] = scoreFactsForExam([fact({ id: "AF-002", predicate: "신고", statement: "신고를 하여야 한다." })]);

    expect(penalty.penaltyRiskScore).toBeGreaterThan(normal.penaltyRiskScore);
    expect(penalty.importanceScore).toBeGreaterThan(normal.importanceScore);
  });

  it("raises difficulty for exception facts", () => {
    const [exception] = scoreFactsForExam([fact({
      exceptions: [{ id: "EX-1", statement: "다만 예외가 있다." }],
      conditions: [{ id: "COND-1", statement: "조건" }]
    })]);
    const [plain] = scoreFactsForExam([fact({ id: "AF-002", statement: "신고를 하여야 한다." })]);

    expect(exception.difficultyScore).toBeGreaterThan(plain.difficultyScore);
  });

  it("does not mutate 433 facts while calculating metadata", () => {
    const facts = Array.from({ length: 433 }, (_, index) => fact({
      id: `AF-${String(index + 1).padStart(3, "0")}`,
      conceptId: `C-${Math.floor(index / 20)}`,
      value: index % 2 === 0 ? index : "value",
      unit: index % 2 === 0 ? "일" : undefined
    }));
    const snapshot = JSON.stringify(facts);

    const scores = scoreFactsForExam(facts, [relation()], { packId: "kr-drone-license:mrm0omvd" });

    expect(scores).toHaveLength(433);
    expect(scores.every((score) => score.reviewStatus === "draft")).toBe(true);
    expect(JSON.stringify(facts)).toBe(snapshot);
  });
});
