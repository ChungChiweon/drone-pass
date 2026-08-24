import { describe, expect, it } from "vitest";
import type { AtomicFact } from "@/domain/exam-engine/types";
import { generateKnowledgeRelations } from "./relation-generator";

function fact(overrides: Partial<AtomicFact> = {}): AtomicFact {
  return {
    id: "AF-001",
    conceptId: "C-1",
    subject: "subject",
    predicate: "registration_period",
    value: 10,
    unit: "일",
    statement: "statement",
    conditions: [],
    exceptions: [],
    sourceReferences: [],
    version: "1",
    status: "draft",
    ...overrides
  };
}

describe("generateKnowledgeRelations", () => {
  it("generates draft relations from declared links and structural rules", () => {
    const relations = generateKnowledgeRelations([
      fact({
        id: "AF-001",
        derivedFrom: ["AF-002"],
        crossReferences: ["AF-003"],
        exceptionGroupReference: "GRP-1"
      }),
      fact({ id: "AF-002", value: 15 }),
      fact({ id: "AF-003", conceptId: "C-2", predicate: "flight_altitude", value: 150, unit: "m" }),
      fact({ id: "AF-004", conceptId: "C-3", groupId: "GRP-1", predicate: "exception_rule", value: true, unit: undefined })
    ], { packId: "pack-a", createdAt: "2026-07-27T00:00:00.000Z" });

    expect(relations).toEqual(expect.arrayContaining([
      expect.objectContaining({ relationType: "DERIVED_FROM", fromFactId: "AF-001", toFactId: "AF-002", reviewStatus: "draft" }),
      expect.objectContaining({ relationType: "RELATED", fromFactId: "AF-001", toFactId: "AF-003", reviewStatus: "draft" }),
      expect.objectContaining({ relationType: "SAME_CONCEPT", fromFactId: "AF-001", toFactId: "AF-002", reviewStatus: "draft" }),
      expect.objectContaining({ relationType: "EXCEPTION_OF", fromFactId: "AF-001", toFactId: "AF-004", reviewStatus: "draft" }),
      expect.objectContaining({ relationType: "COMPARISON_PAIR", fromFactId: "AF-001", toFactId: "AF-002", reviewStatus: "draft" })
    ]));
    expect(relations.every((relation) => relation.packId === "pack-a")).toBe(true);
  });

  it("requires strong semantic signals for same-concept and confused-with relations", () => {
    const relations = generateKnowledgeRelations([
      fact({ id: "AF-001", conceptId: "C-1", subject: "신고 기한", predicate: "신고 기한", value: 10, unit: "일", statement: "신고 기한은 10일이다" }),
      fact({ id: "AF-002", conceptId: "C-1", subject: "신고 기한", predicate: "신고 기한", value: 15, unit: "일", statement: "신고 기한은 15일이다" }),
      fact({ id: "AF-003", conceptId: "C-1", subject: "보험 가입", predicate: "보험 가입 대상", value: "사업자", unit: undefined, statement: "보험 가입 대상은 사업자이다" })
    ], { packId: "pack-a" });

    expect(relations).toEqual(expect.arrayContaining([
      expect.objectContaining({ relationType: "CONFUSED_WITH", fromFactId: "AF-001", toFactId: "AF-002" }),
      expect.objectContaining({ relationType: "SAME_CONCEPT", fromFactId: "AF-001", toFactId: "AF-002" })
    ]));
    expect(relations).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ relationType: "SAME_CONCEPT", fromFactId: "AF-001", toFactId: "AF-003" })
    ]));
  });

  it("removes invalid generated links instead of returning missing fact relations", () => {
    const relations = generateKnowledgeRelations([
      fact({ id: "AF-001", derivedFrom: ["AF-999"], crossReferences: ["AF-001"] }),
      fact({ id: "AF-002", value: 20 })
    ], { packId: "pack-a" });

    expect(relations).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ toFactId: "AF-999" }),
      expect.objectContaining({ fromFactId: "AF-001", toFactId: "AF-001" })
    ]));
  });

  it("can scan a 433 fact pack without mutating facts", () => {
    const facts = Array.from({ length: 433 }, (_, index) => fact({
      id: `AF-${String(index + 1).padStart(3, "0")}`,
      conceptId: `C-${Math.floor(index / 25)}`,
      value: index + 1
    }));
    const snapshot = JSON.stringify(facts);

    const relations = generateKnowledgeRelations(facts, { packId: "kr-drone-license:mrm0omvd" });

    expect(relations.length).toBeGreaterThan(0);
    expect(relations.every((relation) => relation.reviewStatus === "draft")).toBe(true);
    expect(JSON.stringify(facts)).toBe(snapshot);
  }, 30000);
});
