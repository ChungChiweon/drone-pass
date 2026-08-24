import { describe, expect, it } from "vitest";
import type { KnowledgeRelation } from "@/domain/exam-engine/types";
import type { KnowledgeRelationQualityScore } from "./relation-curation";
import { buildGraphReviewQueue } from "./graph-review-queue";

function relation(overrides: Partial<KnowledgeRelation> = {}): KnowledgeRelation {
  return {
    id: "REL-1",
    packId: "pack-a",
    fromFactId: "AF-001",
    toFactId: "AF-002",
    relationType: "CONFUSED_WITH",
    reason: "reason",
    confidence: 0.9,
    createdAt: "2026-07-27T00:00:00.000Z",
    reviewStatus: "draft",
    ...overrides
  };
}

function quality(relationId: string, overrides: Partial<KnowledgeRelationQualityScore> = {}): KnowledgeRelationQualityScore {
  return {
    relationId,
    confidenceScore: 0.9,
    semanticValueScore: 0.8,
    examRelevanceScore: 0.8,
    redundancyScore: 0.1,
    riskScore: 0.2,
    overallScore: 0.8,
    status: "review_candidate",
    ...overrides
  };
}

describe("buildGraphReviewQueue", () => {
  it("includes review and approved candidates only", () => {
    const queue = buildGraphReviewQueue([
      relation({ id: "REL-1" }),
      relation({ id: "REL-2" }),
      relation({ id: "REL-3" })
    ], [
      quality("REL-1", { status: "approved_candidate" }),
      quality("REL-2", { status: "review_candidate" }),
      quality("REL-3", { status: "draft" })
    ]);

    expect(queue.map((item) => item.relation.id)).toEqual(["REL-1", "REL-2"]);
  });

  it("sorts higher score relations first", () => {
    const queue = buildGraphReviewQueue([
      relation({ id: "REL-low" }),
      relation({ id: "REL-high" })
    ], [
      quality("REL-low", { overallScore: 0.65, examRelevanceScore: 0.6 }),
      quality("REL-high", { overallScore: 0.9, examRelevanceScore: 0.95 })
    ]);

    expect(queue[0].relation.id).toBe("REL-high");
  });

  it("prioritizes CONFUSED_WITH over lower-priority relation types when scores are close", () => {
    const queue = buildGraphReviewQueue([
      relation({ id: "REL-same", relationType: "SAME_CONCEPT" }),
      relation({ id: "REL-confused", relationType: "CONFUSED_WITH" })
    ], [
      quality("REL-same", { overallScore: 0.82, examRelevanceScore: 0.8 }),
      quality("REL-confused", { overallScore: 0.8, examRelevanceScore: 0.8 })
    ]);

    expect(queue[0].relation.id).toBe("REL-confused");
  });

  it("does not mutate input relation data", () => {
    const relations = [relation({ id: "REL-1" })];
    const scores = [quality("REL-1")];
    const snapshot = JSON.stringify({ relations, scores });

    buildGraphReviewQueue(relations, scores);

    expect(JSON.stringify({ relations, scores })).toBe(snapshot);
  });
});
