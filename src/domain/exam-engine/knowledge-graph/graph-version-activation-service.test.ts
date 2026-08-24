// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import type { AtomicFact, KnowledgeRelation } from "@/domain/exam-engine/types";
import { checksumRelations } from "./graph-version-candidate";
import { activateGraphVersionCandidate, rollbackActiveGraphVersion, validateGraphVersionActivation } from "./graph-version-activation-service";
import { LocalKnowledgeGraphPersistenceRepository } from "./local-knowledge-graph-repository";

const packId = "pack-a";
const versionId = "kg-candidate-pack-a-20260730000000000";
const relationIds = ["REL-1", "REL-2"];
const contentHash = checksumRelations(packId, relationIds);

const facts: AtomicFact[] = [
  { id: "AF-001", conceptId: "C-1", subject: "a", predicate: "p", value: "1", statement: "one", conditions: [], exceptions: [], status: "approved", sourceReferences: [], version: "1" },
  { id: "AF-002", conceptId: "C-1", subject: "b", predicate: "p", value: "2", statement: "two", conditions: [], exceptions: [], status: "approved", sourceReferences: [], version: "1" },
  { id: "AF-003", conceptId: "C-1", subject: "c", predicate: "p", value: "3", statement: "three", conditions: [], exceptions: [], status: "approved", sourceReferences: [], version: "1" }
];

function relation(overrides: Partial<KnowledgeRelation> = {}): KnowledgeRelation {
  return {
    id: "REL-1",
    packId,
    fromFactId: "AF-001",
    toFactId: "AF-002",
    relationType: "CONFUSED_WITH",
    reason: "same predicate; same unit; different numeric threshold",
    confidence: 0.95,
    createdAt: "2026-07-30T00:00:00.000Z",
    reviewStatus: "approved",
    ...overrides
  };
}

async function seedRepository() {
  const repository = new LocalKnowledgeGraphPersistenceRepository();
  await repository.saveRelation(relation({ id: "REL-1", fromFactId: "AF-001", toFactId: "AF-002" }));
  await repository.saveRelation(relation({ id: "REL-2", fromFactId: "AF-002", toFactId: "AF-003" }));
  await repository.saveVersion({
    versionId,
    packId,
    status: "draft",
    createdAt: "2026-07-30T00:00:00.000Z",
    createdBy: "local-admin",
    relationCount: 2,
    relationIds,
    contentHash,
    benchmarkSummary: {
      classicQuality: 0.67,
      graphAwareQuality: 0.74,
      graphUsageScore: 0.32,
      graphBackedDistractorCount: 2,
      unsafeDistractorCount: 0,
      uniquenessFailureCount: 0
    }
  });
  return repository;
}

beforeEach(() => window.localStorage.clear());

describe("graph version activation service", () => {
  it("activates a valid draft candidate and writes a version audit", async () => {
    const repository = await seedRepository();
    const result = await activateGraphVersionCandidate(repository, {
      packId,
      versionId,
      facts,
      reviewerId: "local-admin",
      reason: "benchmark passed",
      relationIds,
      expectedContentHash: contentHash,
      expectedApprovedFactCount: 3,
      now: () => "2026-08-01T00:00:00.000Z",
      generateAuditId: () => "AUD-1"
    });

    expect(result.noOp).toBe(false);
    expect(result.audit?.auditId).toBe("AUD-1");
    expect((await repository.getVersion(versionId))?.status).toBe("active");
    expect((await repository.getActiveGraph(packId))?.relations.map((item) => item.id)).toEqual(relationIds);
    expect(await repository.getVersionAudit(packId)).toHaveLength(1);
  });

  it("treats activating the already active version as no-op", async () => {
    const repository = await seedRepository();
    const input = {
      packId,
      versionId,
      facts,
      reviewerId: "local-admin",
      reason: "benchmark passed",
      relationIds,
      expectedContentHash: contentHash,
      expectedApprovedFactCount: 3
    };
    await activateGraphVersionCandidate(repository, input);

    const result = await activateGraphVersionCandidate(repository, input);

    expect(result.noOp).toBe(true);
    expect(await repository.getVersionAudit(packId)).toHaveLength(1);
  });

  it("blocks invalid hash, held relation, and draft fact references", async () => {
    const repository = await seedRepository();
    await expect(activateGraphVersionCandidate(repository, {
      packId,
      versionId,
      facts,
      reviewerId: "local-admin",
      reason: "benchmark passed",
      relationIds,
      expectedContentHash: "fnv1a-wrong",
      expectedApprovedFactCount: 3
    })).rejects.toThrow("contentHash mismatch");

    await repository.saveRelation(relation({ id: "REL-2", fromFactId: "AF-002", toFactId: "AF-003", reviewStatus: "held" }));
    const heldValidation = await validateGraphVersionActivation(repository, {
      packId,
      versionId,
      facts,
      relationIds,
      expectedContentHash: contentHash,
      expectedApprovedFactCount: 3
    });
    expect(heldValidation.errors.join(" ")).toContain("not approved");

    await repository.saveRelation(relation({ id: "REL-2", fromFactId: "AF-002", toFactId: "AF-003" }));
    const draftValidation = await validateGraphVersionActivation(repository, {
      packId,
      versionId,
      facts: facts.map((fact) => fact.id === "AF-003" ? { ...fact, status: "draft" } : fact),
      relationIds,
      expectedContentHash: contentHash,
      expectedApprovedFactCount: 2
    });
    expect(draftValidation.errors.join(" ")).toContain("is not approved");
  });

  it("rolls back and reactivates the same version", async () => {
    const repository = await seedRepository();
    await activateGraphVersionCandidate(repository, {
      packId,
      versionId,
      facts,
      reviewerId: "local-admin",
      reason: "benchmark passed",
      relationIds,
      expectedContentHash: contentHash,
      expectedApprovedFactCount: 3,
      generateAuditId: () => "AUD-ACTIVATE"
    });

    const rollback = await rollbackActiveGraphVersion(repository, {
      packId,
      versionId,
      reviewerId: "local-admin",
      reason: "round trip",
      generateAuditId: () => "AUD-ROLLBACK"
    });

    expect(rollback.noOp).toBe(false);
    expect(rollback.audit?.auditId).toBe("AUD-ROLLBACK");
    expect(await repository.getActiveGraph(packId)).toBeNull();
    expect((await repository.getVersion(versionId))?.status).toBe("draft");

    await activateGraphVersionCandidate(repository, {
      packId,
      versionId,
      facts,
      reviewerId: "local-admin",
      reason: "benchmark passed",
      relationIds,
      expectedContentHash: contentHash,
      expectedApprovedFactCount: 3,
      generateAuditId: () => "AUD-REACTIVATE"
    });

    expect((await repository.getActiveGraph(packId))?.relations).toHaveLength(2);
    expect((await repository.getVersionAudit(packId)).map((entry) => entry.auditId)).toEqual(["AUD-ACTIVATE", "AUD-ROLLBACK", "AUD-REACTIVATE"]);
  });
});
