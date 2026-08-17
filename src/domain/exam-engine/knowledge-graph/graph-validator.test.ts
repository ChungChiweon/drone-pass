import { describe, expect, it } from "vitest";
import type { AtomicFact, KnowledgeRelation } from "@/domain/exam-engine/types";
import { validateKnowledgeRelations } from "./graph-validator";

function fact(id: string): AtomicFact {
  return {
    id,
    conceptId: "C-1",
    subject: "subject",
    predicate: "predicate",
    value: "value",
    statement: "statement",
    conditions: [],
    exceptions: [],
    sourceReferences: [],
    version: "1",
    status: "draft"
  };
}

function relation(overrides: Partial<KnowledgeRelation> = {}): KnowledgeRelation {
  return {
    id: "REL-1",
    packId: "pack-a",
    fromFactId: "AF-001",
    toFactId: "AF-002",
    relationType: "RELATED",
    reason: "related",
    confidence: 0.8,
    createdAt: "2026-07-27T00:00:00.000Z",
    reviewStatus: "draft",
    ...overrides
  };
}

describe("validateKnowledgeRelations", () => {
  it("removes relations with missing fact ids", () => {
    const result = validateKnowledgeRelations([fact("AF-001")], [relation()]);

    expect(result.validRelations).toEqual([]);
    expect(result.issues.map((issue) => issue.code)).toContain("MISSING_TO_FACT");
  });

  it("removes self relations", () => {
    const result = validateKnowledgeRelations([fact("AF-001")], [relation({ toFactId: "AF-001" })]);

    expect(result.validRelations).toEqual([]);
    expect(result.issues).toEqual([expect.objectContaining({ code: "SELF_RELATION" })]);
  });

  it("removes relations with invalid confidence", () => {
    const result = validateKnowledgeRelations([fact("AF-001"), fact("AF-002")], [relation({ confidence: 1.2 })]);

    expect(result.validRelations).toEqual([]);
    expect(result.issues).toEqual([expect.objectContaining({ code: "INVALID_CONFIDENCE" })]);
  });
});
