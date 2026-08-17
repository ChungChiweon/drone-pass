// @vitest-environment jsdom

import { describe, expect, it, beforeEach } from "vitest";
import type { AtomicFact, KnowledgeRelation } from "@/domain/exam-engine/types";
import { LocalKnowledgeGraphPersistenceRepository } from "./local-knowledge-graph-repository";
import { activateGraphVersion, approveRelation, createDraftVersionFromApprovedRelations, holdRelation, rejectRelation } from "./graph-review-action-service";
import { createAuditIdGenerator } from "./knowledge-relation-review-audit-id";

const relation = (overrides: Partial<KnowledgeRelation> = {}): KnowledgeRelation => ({
  id: "rel-1",
  packId: "pack-a",
  fromFactId: "AF-001",
  toFactId: "AF-002",
  relationType: "CONFUSED_WITH",
  reason: "similar numeric rule",
  confidence: 0.92,
  createdAt: "2026-07-28T00:00:00.000Z",
  reviewStatus: "draft",
  ...overrides
});

const facts: AtomicFact[] = [
  { id: "AF-001", conceptId: "C-1", subject: "a", predicate: "p", value: "1", statement: "one", conditions: [], exceptions: [], status: "draft", sourceReferences: [], version: "1" },
  { id: "AF-002", conceptId: "C-1", subject: "b", predicate: "p", value: "2", statement: "two", conditions: [], exceptions: [], status: "draft", sourceReferences: [], version: "1" }
];

describe("graph review action service", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("approves a relation without mutating the original and writes audit", async () => {
    const repository = new LocalKnowledgeGraphPersistenceRepository();
    const original = relation();
    await repository.saveRelation(original);

    const result = await approveRelation({
      relation: original,
      reviewerId: "admin",
      memo: "ok",
      timestamp: "2026-07-28T01:00:00.000Z",
      auditIdGenerator: createAuditIdGenerator(() => "KGAUD-test-001")
    }, repository);

    expect(original.reviewStatus).toBe("draft");
    expect(result.relation.reviewStatus).toBe("approved");
    expect((await repository.getRelations("pack-a"))[0].reviewStatus).toBe("approved");
    expect(await repository.getReviewAudit("pack-a")).toEqual([
      {
        auditId: "KGAUD-test-001",
        relationId: "rel-1",
        reviewerId: "admin",
        previousStatus: "draft",
        nextStatus: "approved",
        action: "APPROVE",
        memo: "ok",
        timestamp: "2026-07-28T01:00:00.000Z"
      }
    ]);
  });

  it("rejects and holds relations through explicit actions", async () => {
    const repository = new LocalKnowledgeGraphPersistenceRepository();
    const rejected = await rejectRelation({ relation: relation({ id: "rel-reject" }) }, repository);
    const held = await holdRelation({ relation: relation({ id: "rel-hold" }) }, repository);

    expect(rejected.relation.reviewStatus).toBe("rejected");
    expect(held.relation.reviewStatus).toBe("held");
  });

  it("blocks duplicate terminal processing", async () => {
    const repository = new LocalKnowledgeGraphPersistenceRepository();
    await expect(approveRelation({ relation: relation({ reviewStatus: "approved" }) }, repository)).resolves.toMatchObject({
      relation: { reviewStatus: "approved" },
      audit: null
    });
    await expect(rejectRelation({ relation: relation({ reviewStatus: "rejected" }) }, repository)).resolves.toMatchObject({
      relation: { reviewStatus: "rejected" },
      audit: null
    });
  });

  it("skips review audit when the requested status already matches the stored relation", async () => {
    const repository = new LocalKnowledgeGraphPersistenceRepository();
    await repository.saveRelation(relation({ reviewStatus: "approved" }));

    const result = await approveRelation({
      relation: relation(),
      reviewerId: "admin",
      auditIdGenerator: createAuditIdGenerator(() => {
        throw new Error("generator should not be called for no-op transitions");
      })
    }, repository);

    expect(result.audit).toBeNull();
    expect((await repository.getReviewAudit("pack-a")).length).toBe(0);
    expect((await repository.getRelations("pack-a"))[0].reviewStatus).toBe("approved");
  });

  it("blocks held relations from being held again without duplicating audit", async () => {
    const repository = new LocalKnowledgeGraphPersistenceRepository();
    await repository.saveRelation(relation({ reviewStatus: "held" }));

    await expect(holdRelation({ relation: relation({ reviewStatus: "held" }) }, repository)).resolves.toMatchObject({
      relation: { reviewStatus: "held" },
      audit: null
    });
    expect((await repository.getReviewAudit("pack-a")).length).toBe(0);
  });

  it("creates unique audit ids for separate transitions", async () => {
    const repository = new LocalKnowledgeGraphPersistenceRepository();
    await approveRelation({
      relation: relation({ id: "rel-2" }),
      auditIdGenerator: createAuditIdGenerator(() => "KGAUD-test-002")
    }, repository);
    await rejectRelation({
      relation: relation({ id: "rel-3" }),
      auditIdGenerator: createAuditIdGenerator(() => "KGAUD-test-003")
    }, repository);

    expect((await repository.getReviewAudit("pack-a")).map((entry) => entry.auditId)).toEqual(["KGAUD-test-002", "KGAUD-test-003"]);
  });

  it("keeps legacy audits readable without audit ids", async () => {
    const repository = new LocalKnowledgeGraphPersistenceRepository();
    await repository.saveRelation(relation({ id: "rel-legacy" }));
    await repository.saveReviewAudit({
      relationId: "rel-legacy",
      reviewerId: "admin",
      previousStatus: "draft",
      nextStatus: "approved",
      action: "APPROVE",
      memo: "legacy",
      timestamp: "2026-07-28T00:00:00.000Z"
    });

    expect(await repository.getReviewAudit("pack-a")).toEqual([
      {
        relationId: "rel-legacy",
        reviewerId: "admin",
        previousStatus: "draft",
        nextStatus: "approved",
        action: "APPROVE",
        memo: "legacy",
        timestamp: "2026-07-28T00:00:00.000Z"
      }
    ]);
  });

  it("creates draft versions from approved relations only", async () => {
    const repository = new LocalKnowledgeGraphPersistenceRepository();
    const version = await createDraftVersionFromApprovedRelations({
      packId: "pack-a",
      relations: [relation({ reviewStatus: "approved" }), relation({ id: "draft-rel" })],
      timestamp: "2026-07-28T02:00:00.000Z"
    }, repository);

    expect(version.status).toBe("draft");
    expect(version.relationCount).toBe(1);
  });

  it("activates approved-only snapshots and archives prior active versions", async () => {
    const repository = new LocalKnowledgeGraphPersistenceRepository();
    const approved = relation({ reviewStatus: "approved" });
    const first = await createDraftVersionFromApprovedRelations({ packId: "pack-a", relations: [approved], timestamp: "2026-07-28T02:00:00.000Z" }, repository);
    await activateGraphVersion({ version: first, relations: [approved], facts, reviewerId: "admin", timestamp: "2026-07-28T02:10:00.000Z" }, repository);

    const second = await createDraftVersionFromApprovedRelations({ packId: "pack-a", relations: [approved], timestamp: "2026-07-28T03:00:00.000Z" }, repository);
    const snapshot = await activateGraphVersion({ version: second, relations: [approved], facts, reviewerId: "admin", timestamp: "2026-07-28T03:10:00.000Z" }, repository);

    expect(snapshot.relations).toEqual([approved]);
    expect((await repository.getVersion(first.versionId))?.status).toBe("archived");
    expect((await repository.getVersion(second.versionId))?.status).toBe("active");
    expect((await repository.getActiveGraph("pack-a"))?.relations).toEqual([approved]);
  });

  it("rejects invalid active graph relations", async () => {
    const repository = new LocalKnowledgeGraphPersistenceRepository();
    const invalid = relation({ reviewStatus: "approved", toFactId: "AF-MISSING" });
    const version = await createDraftVersionFromApprovedRelations({ packId: "pack-a", relations: [invalid] }, repository);

    await expect(activateGraphVersion({ version, relations: [invalid], facts, reviewerId: "admin" }, repository)).rejects.toThrow("invalid relations");
  });
});
