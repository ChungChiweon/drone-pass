import { describe, expect, it } from "vitest";
import type { KnowledgeRelation } from "@/domain/exam-engine/types";
import { approveRelationCandidate } from "./graph-approval-service";
import { archivedGraphVersion, createDraftGraphVersion } from "./graph-approval-repository";
import { getProductionGraph } from "./production-graph-selector";
import type { KnowledgeGraphVersion } from "./graph-versioning";

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

function activeVersion(overrides: Partial<KnowledgeGraphVersion> = {}): KnowledgeGraphVersion {
  return {
    versionId: "graph-v1",
    packId: "pack-a",
    createdAt: "2026-07-28T00:00:00.000Z",
    relationCount: 1,
    status: "active",
    ...overrides
  };
}

describe("graph approval and versioning", () => {
  it("converts a candidate relation into an approved relation plus audit without mutating input", () => {
    const candidate = relation({ reviewStatus: "reviewed" });
    const snapshot = JSON.stringify(candidate);

    const result = approveRelationCandidate(candidate, {
      reviewerId: "reviewer-1",
      sourceVersion: "graph-v1",
      approvedAt: "2026-07-28T01:00:00.000Z",
      memo: "verified"
    });

    expect(result.approvedRelation.relation.reviewStatus).toBe("approved");
    expect(result.approvedRelation.approvedBy).toBe("reviewer-1");
    expect(result.approvedRelation.sourceVersion).toBe("graph-v1");
    expect(result.audit).toMatchObject({
      relationId: "REL-1",
      previousStatus: "reviewed",
      nextStatus: "approved",
      action: "APPROVE",
      memo: "verified"
    });
    expect(JSON.stringify(candidate)).toBe(snapshot);
  });

  it("returns only approved relations for an active production graph", () => {
    const production = getProductionGraph([
      relation({ id: "REL-draft", reviewStatus: "draft" }),
      relation({ id: "REL-approved", reviewStatus: "approved" }),
      relation({ id: "REL-other-pack", packId: "pack-b", reviewStatus: "approved" })
    ], activeVersion());

    expect(production.map((item) => item.id)).toEqual(["REL-approved"]);
  });

  it("returns no production relations for non-active versions", () => {
    expect(getProductionGraph([relation({ reviewStatus: "approved" })], activeVersion({ status: "review" }))).toEqual([]);
    expect(getProductionGraph([relation({ reviewStatus: "approved" })], null)).toEqual([]);
  });

  it("creates draft versions and archives versions immutably", () => {
    const version = createDraftGraphVersion({
      packId: "pack-a",
      versionId: "graph-v2",
      relationCount: 7,
      createdAt: "2026-07-28T00:00:00.000Z"
    });
    const archived = archivedGraphVersion(version);

    expect(version).toMatchObject({ versionId: "graph-v2", relationCount: 7, status: "draft" });
    expect(archived).toMatchObject({ versionId: "graph-v2", status: "archived" });
    expect(version.status).toBe("draft");
  });
});
