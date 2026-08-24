import { describe, expect, it } from "vitest";
import type { AtomicFact } from "@/domain/exam-engine/types";
import { createPromotionGraphCandidates } from "./fact-promotion-graph";
import { executePromotion, rollbackPromotion } from "./fact-promotion-service";
import type { FactPromotionPreview } from "./knowledge-ingestion";

const sourceReference = { documentId: "law", revisionId: "rev-1", locator: "제1조" };

function preview(overrides: Partial<FactPromotionPreview> = {}): FactPromotionPreview {
  return {
    candidateId: "SRC:candidate-001",
    proposedFactId: "AF-434",
    statement: "25kg 이상 장치는 별도 신고를 하여야 한다",
    conceptId: "concept:approval",
    categoryId: "category:flight-approval",
    sourceReference,
    confidence: 0.86,
    validationResult: { valid: true, warnings: [], errors: [] },
    graphConnectionCandidates: { newFactId: "AF-434", relatedFactIds: ["AF-433"], suggestedRelations: [] },
    ...overrides
  };
}

function fact(overrides: Partial<AtomicFact> = {}): AtomicFact {
  return {
    id: "AF-433",
    conceptId: "concept:approval",
    subject: "장치",
    predicate: "ingested_fact",
    value: "25kg 이상 장치는 승인을 받아야 한다",
    unit: "kg",
    statement: "25kg 이상 장치는 승인을 받아야 한다",
    conditions: [],
    exceptions: [],
    sourceReferences: [sourceReference],
    version: "1",
    status: "approved",
    ...overrides
  };
}

describe("fact promotion service", () => {
  it("executes a valid preview into a generated AtomicFact object without appending it", () => {
    const result = executePromotion(preview(), {
      reviewerId: "admin",
      memo: "ready",
      timestamp: "2026-07-28T00:00:00.000Z"
    });

    expect(result.generatedFact).toMatchObject({
      id: "AF-434",
      conceptId: "concept:approval",
      statement: "25kg 이상 장치는 별도 신고를 하여야 한다",
      status: "draft"
    });
    expect(result.generatedFact.sourceReferences).toEqual([sourceReference]);
    expect(result.execution).toMatchObject({
      previewId: "promotion:SRC:candidate-001:AF-434",
      candidateId: "SRC:candidate-001",
      generatedFactId: "AF-434",
      previousState: "approved",
      nextState: "executed"
    });
    expect(result.audit).toMatchObject({ action: "EXECUTE_PREVIEW", reviewerId: "admin", memo: "ready" });
  });

  it("blocks invalid preview execution", () => {
    expect(() => executePromotion(preview({
      validationResult: { valid: false, warnings: [], errors: ["sourceReference is required"] }
    }), { reviewerId: "admin" })).toThrow("Promotion preview is invalid");
  });

  it("creates rollback structure without mutating the execution", () => {
    const result = executePromotion(preview(), { reviewerId: "admin", timestamp: "2026-07-28T00:00:00.000Z" });
    const before = JSON.stringify(result.execution);
    const rollback = rollbackPromotion(result.execution, { reviewerId: "admin", memo: "undo", timestamp: "2026-07-28T01:00:00.000Z" });

    expect(JSON.stringify(result.execution)).toBe(before);
    expect(rollback.execution).toMatchObject({ previousState: "executed", nextState: "rolled_back" });
    expect(rollback.audit).toMatchObject({ action: "ROLLBACK", memo: "undo" });
  });

  it("creates draft graph relation candidates for a promoted fact", () => {
    const { generatedFact } = executePromotion(preview(), { reviewerId: "admin" });
    const graph = createPromotionGraphCandidates(generatedFact, [fact()]);

    expect(graph.newFactId).toBe("AF-434");
    expect(graph.suggestedRelations.length).toBeGreaterThan(0);
    expect(graph.suggestedRelations.every((relation) => relation.reviewStatus === "draft")).toBe(true);
    expect(graph.suggestedRelations.map((relation) => relation.relationType)).toEqual(expect.arrayContaining(["SAME_CONCEPT", "RELATED", "CONFUSED_WITH"]));
  });

  it("does not mutate existing facts while creating graph candidates", () => {
    const existing = [fact()];
    const before = JSON.stringify(existing);
    const { generatedFact } = executePromotion(preview(), { reviewerId: "admin" });
    createPromotionGraphCandidates(generatedFact, existing);

    expect(JSON.stringify(existing)).toBe(before);
  });
});
