// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import type { KnowledgeRelation } from "@/domain/exam-engine/types";
import {
  KNOWLEDGE_GRAPH_APPROVALS_KEY,
  KNOWLEDGE_GRAPH_RELATIONS_KEY,
  KNOWLEDGE_GRAPH_VERSIONS_KEY,
  LocalKnowledgeGraphPersistenceRepository
} from "./local-knowledge-graph-repository";

function relation(overrides: Partial<KnowledgeRelation> = {}): KnowledgeRelation {
  return {
    id: "REL-1",
    packId: "pack-a",
    fromFactId: "AF-001",
    toFactId: "AF-002",
    relationType: "CONFUSED_WITH",
    reason: "reason",
    confidence: 0.9,
    createdAt: "2026-07-28T00:00:00.000Z",
    reviewStatus: "draft",
    ...overrides
  };
}

beforeEach(() => window.localStorage.clear());

describe("LocalKnowledgeGraphPersistenceRepository", () => {
  it("saves and loads relations by pack", async () => {
    const repository = new LocalKnowledgeGraphPersistenceRepository();
    await repository.saveRelation(relation({ id: "REL-A", packId: "pack-a" }));
    await repository.saveRelation(relation({ id: "REL-B", packId: "pack-b" }));

    expect(await repository.getRelations("pack-a")).toEqual([relation({ id: "REL-A", packId: "pack-a" })]);
    expect(JSON.parse(window.localStorage.getItem(KNOWLEDGE_GRAPH_RELATIONS_KEY) ?? "[]")).toHaveLength(2);
  });

  it("keeps versions separated and retrieves them by version id", async () => {
    const repository = new LocalKnowledgeGraphPersistenceRepository();
    await repository.saveVersion({ versionId: "v1", packId: "pack-a", createdAt: "2026-07-28T00:00:00.000Z", relationCount: 1 });
    await repository.saveVersion({ versionId: "v2", packId: "pack-b", createdAt: "2026-07-28T00:00:00.000Z", relationCount: 2 });

    expect(await repository.getVersion("v1")).toMatchObject({ versionId: "v1", packId: "pack-a", status: "draft" });
    expect(await repository.getVersion("v2")).toMatchObject({ versionId: "v2", packId: "pack-b", relationCount: 2 });
    expect(JSON.parse(window.localStorage.getItem(KNOWLEDGE_GRAPH_VERSIONS_KEY) ?? "[]")).toHaveLength(2);
  });

  it("persists a draft candidate idempotently without changing the active graph", async () => {
    const repository = new LocalKnowledgeGraphPersistenceRepository();
    const candidate = {
      versionId: "kg-candidate-pack-a-1",
      packId: "pack-a",
      createdAt: "2026-07-30T00:00:00.000Z",
      createdBy: "local-admin",
      relationCount: 2,
      relationIds: ["REL-1", "REL-2"],
      contentHash: "fnv1a-test",
      status: "draft" as const
    };

    await repository.saveVersion(candidate);
    await repository.saveVersion(candidate);

    expect(await repository.getVersion(candidate.versionId)).toEqual(candidate);
    expect(JSON.parse(window.localStorage.getItem(KNOWLEDGE_GRAPH_VERSIONS_KEY) ?? "[]")).toHaveLength(1);
    expect(await repository.getActiveGraph("pack-a")).toBeNull();
  });

  it("loads active graph from approved relations and excludes draft relations", async () => {
    const repository = new LocalKnowledgeGraphPersistenceRepository();
    const approved = relation({ id: "REL-approved", reviewStatus: "approved" });
    const draft = relation({ id: "REL-draft", reviewStatus: "draft" });
    await repository.saveVersion({ versionId: "v-active", packId: "pack-a", createdAt: "2026-07-28T00:00:00.000Z", relationCount: 2, status: "active" });
    await repository.saveRelation(approved);
    await repository.saveRelation(draft);
    await repository.saveApproval({ relation: approved, approvedAt: "2026-07-28T00:00:00.000Z", approvedBy: "reviewer", sourceVersion: "v-active" });

    const active = await repository.getActiveGraph("pack-a");

    expect(active?.versionId).toBe("v-active");
    expect(active?.relations.map((item) => item.id)).toEqual(["REL-approved"]);
    expect(JSON.parse(window.localStorage.getItem(KNOWLEDGE_GRAPH_APPROVALS_KEY) ?? "[]")).toHaveLength(1);
  });

  it("archives versions immutably", async () => {
    const repository = new LocalKnowledgeGraphPersistenceRepository();
    await repository.saveVersion({ versionId: "v1", packId: "pack-a", createdAt: "2026-07-28T00:00:00.000Z", relationCount: 1, status: "active" });

    const archived = await repository.archiveVersion("v1");

    expect(archived).toMatchObject({ versionId: "v1", status: "archived" });
    expect(await repository.getActiveGraph("pack-a")).toBeNull();
  });

  it("restores a snapshot into an active graph", async () => {
    const repository = new LocalKnowledgeGraphPersistenceRepository();
    const approved = relation({ id: "REL-approved", reviewStatus: "approved" });
    const draft = relation({ id: "REL-draft", reviewStatus: "draft" });

    await repository.restoreSnapshot({
      versionId: "snapshot-v1",
      packId: "pack-a",
      relations: [approved, draft],
      createdAt: "2026-07-28T00:00:00.000Z"
    });

    expect(await repository.getVersion("snapshot-v1")).toMatchObject({ status: "active", relationCount: 2 });
    expect(await repository.getRelations("pack-a")).toHaveLength(2);
    expect((await repository.getActiveGraph("pack-a"))?.relations).toEqual([approved]);
  });
});
