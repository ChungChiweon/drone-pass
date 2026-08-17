import { describe, expect, it } from "vitest";
import type { KnowledgeRelation, RelationType } from "@/domain/exam-engine/types";
import { rankRelationsForFact, scoreRelation } from "./relation-ranking";

function relation(relationType: RelationType, confidence = 1): KnowledgeRelation {
  return {
    id: `REL-${relationType}`,
    packId: "pack-a",
    fromFactId: "AF-001",
    toFactId: "AF-002",
    relationType,
    reason: "reason",
    confidence,
    createdAt: "2026-07-27T00:00:00.000Z",
    reviewStatus: "draft"
  };
}

describe("scoreRelation", () => {
  it("returns configured priority scores for relation types", () => {
    expect(scoreRelation(relation("CONFUSED_WITH")).baseScore).toBe(0.95);
    expect(scoreRelation(relation("EXCEPTION_OF")).baseScore).toBe(0.95);
    expect(scoreRelation(relation("CONTRASTS_WITH")).baseScore).toBe(0.9);
    expect(scoreRelation(relation("COMPARISON_PAIR")).baseScore).toBe(0.85);
    expect(scoreRelation(relation("PREREQUISITE_FOR")).baseScore).toBe(0.8);
    expect(scoreRelation(relation("DERIVED_FROM")).baseScore).toBe(0.7);
    expect(scoreRelation(relation("RELATED")).baseScore).toBe(0.5);
    expect(scoreRelation(relation("SAME_CONCEPT")).baseScore).toBe(0.4);
  });
});

describe("rankRelationsForFact", () => {
  it("sorts relations by relation priority and confidence", () => {
    const ranked = rankRelationsForFact("AF-001", [
      relation("SAME_CONCEPT", 1),
      relation("CONFUSED_WITH", 0.9),
      relation("RELATED", 1)
    ]);

    expect(ranked.map((item) => item.relationType)).toEqual(["CONFUSED_WITH", "RELATED", "SAME_CONCEPT"]);
  });
});
