import { describe, expect, it } from "vitest";
import type { AtomicFact } from "@/domain/exam-engine/types";
import { analyzeKnowledgeGraph } from "./graph-analysis-pipeline";
import { relationPriorityValue } from "./relation-ranking";

function fact(overrides: Partial<AtomicFact> = {}): AtomicFact {
  return {
    id: "AF-001",
    conceptId: "C-1",
    subject: "subject",
    predicate: "threshold",
    value: 25,
    unit: "kg",
    statement: "statement",
    conditions: [],
    exceptions: [],
    sourceReferences: [],
    version: "1",
    status: "draft",
    ...overrides
  };
}

describe("analyzeKnowledgeGraph", () => {
  it("analyzes a 433 fact pack without mutating facts", () => {
    const facts = Array.from({ length: 433 }, (_, index) => fact({
      id: `AF-${String(index + 1).padStart(3, "0")}`,
      conceptId: `C-${Math.floor(index / 18)}`,
      predicate: `predicate-${index % 9}`,
      value: index % 2 === 0 ? 25 + index : `value-${index}`,
      unit: index % 2 === 0 ? "kg" : undefined,
      conditions: index % 5 === 0 ? [{ id: `COND-${index}`, statement: "condition" }] : [],
      exceptions: index % 7 === 0 ? [{ id: `EX-${index}`, statement: "exception" }] : []
    }));
    const snapshot = JSON.stringify(facts);

    const result = analyzeKnowledgeGraph("pack-a", facts);

    expect(result.totalFacts).toBe(433);
    expect(result.validatedRelations.length).toBeGreaterThan(0);
    expect(result.validatedRelations.every((relation) => relation.reviewStatus === "draft")).toBe(true);
    expect(JSON.stringify(facts)).toBe(snapshot);
  }, 30000);

  it("generates and summarizes relation candidates by type", () => {
    const result = analyzeKnowledgeGraph("pack-a", [
      fact({ id: "AF-001", conceptId: "C-1", subject: "weight threshold", predicate: "weight", value: 25, unit: "kg", derivedFrom: ["AF-002"], crossReferences: ["AF-003"], exceptionGroupReference: "GRP-1", operator: "gt" }),
      fact({ id: "AF-002", conceptId: "C-1", subject: "weight threshold", predicate: "weight", value: 150, unit: "kg", operator: "lte" }),
      fact({ id: "AF-003", conceptId: "C-2", predicate: "height", value: 150, unit: "m" }),
      fact({ id: "AF-004", conceptId: "C-1", predicate: "weight", value: 180, unit: "kg", conditions: [{ id: "COND-1", statement: "condition" }] }),
      fact({ id: "AF-005", conceptId: "C-3", predicate: "exception", value: true, unit: undefined, groupId: "GRP-1" }),
      fact({ id: "AF-006", conceptId: "C-4", subject: "flight limit", predicate: "speed threshold", value: 80, unit: "kmh" }),
      fact({ id: "AF-007", conceptId: "C-4", subject: "flight limit", predicate: "speed threshold", value: 100, unit: "kmh" })
    ]);

    expect(result.relationSummary.DERIVED_FROM).toBeGreaterThan(0);
    expect(result.relationSummary.RELATED).toBeGreaterThan(0);
    expect(result.relationSummary.SAME_CONCEPT).toBeGreaterThan(0);
    expect(result.relationSummary.EXCEPTION_OF).toBeGreaterThan(0);
    expect(result.relationSummary.COMPARISON_PAIR).toBeGreaterThan(0);
    expect(result.relationSummary.CONTRASTS_WITH).toBeGreaterThan(0);
    expect(result.relationSummary.CONFUSED_WITH).toBeGreaterThanOrEqual(0);
  });

  it("validates generated relations and removes duplicate relation pairs", () => {
    const result = analyzeKnowledgeGraph("pack-a", [
      fact({ id: "AF-001", conceptId: "C-1", predicate: "same", value: 1, unit: "kg", crossReferences: ["AF-002"] }),
      fact({ id: "AF-002", conceptId: "C-1", predicate: "same", value: 2, unit: "kg", crossReferences: ["AF-001"] })
    ]);

    const keys = result.validatedRelations.map((relation) => `${relation.relationType}:${[relation.fromFactId, relation.toFactId].sort().join("-")}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(result.validatedRelations.every((relation) => relation.fromFactId !== relation.toFactId)).toBe(true);
    expect(result.validatedRelations.every((relation) => relation.confidence >= 0.6)).toBe(true);
  });

  it("sorts validated relations by ranking priority", () => {
    const result = analyzeKnowledgeGraph("pack-a", [
      fact({ id: "AF-001", conceptId: "C-1", predicate: "same", value: 1, unit: "kg", crossReferences: ["AF-003"] }),
      fact({ id: "AF-002", conceptId: "C-1", predicate: "same", value: 2, unit: "kg" }),
      fact({ id: "AF-003", conceptId: "C-2", predicate: "other", value: true, unit: undefined })
    ]);

    expect(relationPriorityValue(result.validatedRelations[0])).toBeGreaterThanOrEqual(relationPriorityValue(result.validatedRelations.at(-1)!));
  });
});
