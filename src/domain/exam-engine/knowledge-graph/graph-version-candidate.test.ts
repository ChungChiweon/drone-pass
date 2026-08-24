import { describe, expect, it } from "vitest";
import type { AtomicFact, KnowledgeRelation } from "@/domain/exam-engine/types";
import { createInactiveGraphVersionCandidate } from "./graph-version-candidate";

const facts: AtomicFact[] = [
  { id: "AF-001", conceptId: "C-1", subject: "a", predicate: "p", value: "1", statement: "one", conditions: [], exceptions: [], status: "approved", sourceReferences: [], version: "1" },
  { id: "AF-002", conceptId: "C-1", subject: "b", predicate: "p", value: "2", statement: "two", conditions: [], exceptions: [], status: "approved", sourceReferences: [], version: "1" },
  { id: "AF-003", conceptId: "C-1", subject: "c", predicate: "p", value: "3", statement: "three", conditions: [], exceptions: [], status: "approved", sourceReferences: [], version: "1" }
];

const relation = (overrides: Partial<KnowledgeRelation> = {}): KnowledgeRelation => ({
  id: "rel-1",
  packId: "pack-a",
  fromFactId: "AF-001",
  toFactId: "AF-002",
  relationType: "CONFUSED_WITH",
  reason: "same predicate; same unit; different numeric threshold",
  confidence: 0.95,
  createdAt: "2026-07-30T00:00:00.000Z",
  reviewStatus: "approved",
  ...overrides
});

describe("graph version candidate", () => {
  it("creates an inactive draft version from approved relations only", () => {
    const result = createInactiveGraphVersionCandidate({
      packId: "pack-a",
      relations: [relation(), relation({ id: "held-rel", reviewStatus: "held", toFactId: "AF-003" })],
      facts,
      relationIds: ["rel-1"],
      createdAt: "2026-07-30T01:00:00.000Z",
      createdBy: "reviewer",
      auditRawCount: 14,
      auditEffectiveTransitionCount: 12
    });

    expect(result.version.status).toBe("draft");
    expect(result.version.relationCount).toBe(1);
    expect(result.version.relationIds).toEqual(["rel-1"]);
    expect(result.version.sourceReviewSummary?.heldRelationCount).toBe(1);
  });

  it("rejects held, duplicate, and invalid fact references", () => {
    expect(() => createInactiveGraphVersionCandidate({
      packId: "pack-a",
      relations: [relation({ reviewStatus: "held" })],
      facts,
      relationIds: ["rel-1"],
      createdAt: "2026-07-30T01:00:00.000Z",
      createdBy: "reviewer"
    })).toThrow("not approved");

    expect(() => createInactiveGraphVersionCandidate({
      packId: "pack-a",
      relations: [relation(), relation()],
      facts,
      relationIds: ["rel-1", "rel-1"],
      createdAt: "2026-07-30T01:00:00.000Z",
      createdBy: "reviewer"
    })).toThrow("Duplicate relation");

    expect(() => createInactiveGraphVersionCandidate({
      packId: "pack-a",
      relations: [relation({ toFactId: "AF-MISSING" })],
      facts,
      relationIds: ["rel-1"],
      createdAt: "2026-07-30T01:00:00.000Z",
      createdBy: "reviewer"
    })).toThrow("missing toFact");
  });
});
