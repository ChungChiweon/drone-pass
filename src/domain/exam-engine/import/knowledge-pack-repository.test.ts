// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { KnowledgePack } from "@/domain/exam-engine/types";
import {
  ACTIVE_PACK_CACHE_KEY,
  cacheKnowledgePack,
  LEGACY_REVIEW_AUDIT_KEY,
  normalizeLegacyAudit
} from "./local-knowledge-pack-repository";
import { CachedKnowledgePackRepository } from "./supabase-knowledge-pack-repository";
import type {
  KnowledgePackRepository,
  StoredKnowledgePack
} from "./knowledge-pack-repository";

function pack(id: string, approved = 0): StoredKnowledgePack {
  const facts = Array.from({ length: 20 }, (_, index) => ({
    id: `AF-${String(index + 1).padStart(3, "0")}`,
    conceptId: "C-1",
    subject: "s",
    predicate: "p",
    value: index,
    statement: "statement",
    conditions: [],
    exceptions: [],
    sourceReferences: [],
    version: "1",
    status: index < approved ? "approved" as const : "draft" as const
  }));
  return {
    id,
    name: id,
    importedAt: "2026-07-27T00:00:00.000Z",
    pack: {
      domainPack: {
        exams: [{ id: "exam", title: "Exam", countryCode: "KR", description: "", subjectIds: ["S-1"] }],
        subjects: [{ id: "S-1", examId: "exam", title: "Subject", description: "", categoryIds: ["CAT-1"] }],
        categories: [{ id: "CAT-1", subjectId: "S-1", title: "Category" }]
      },
      sourceDocuments: [],
      sourceRevisions: [],
      concepts: [{ id: "C-1", subjectId: "S-1", categoryIds: ["CAT-1"], title: "Concept", summary: "" }],
      atomicFacts: facts,
      questionTemplates: [],
      distractorRules: []
    } as KnowledgePack
  };
}

function server(overrides: Partial<KnowledgePackRepository> = {}): KnowledgePackRepository {
  const active = pack("server", 17);
  return {
    list: vi.fn(async () => [active]),
    get: vi.fn(async () => active),
    getActive: vi.fn(async () => active),
    save: vi.fn(async () => active),
    update: vi.fn(async () => active),
    setActive: vi.fn(async () => active),
    importAndActivate: vi.fn(async (input) => input.item),
    updateReview: vi.fn(async () => active),
    updateChecklist: vi.fn(async () => ({ reviewState: "unreviewed" as const, reviewMemo: "", reviewedAt: null, reviewedBy: null })),
    getReviewMetadata: vi.fn(async () => ({})),
    getAudit: vi.fn(async () => []),
    ...overrides
  };
}

beforeEach(() => window.localStorage.clear());

describe("CachedKnowledgePackRepository", () => {
  it("always gives a server ACTIVE pack priority and caches its approved state", async () => {
    cacheKnowledgePack(pack("local", 7), true);
    const repository = new CachedKnowledgePackRepository(server());
    const result = await repository.loadActive();
    expect(result.source).toBe("server");
    expect(result.value?.id).toBe("server");
    expect(result.value?.pack.atomicFacts.filter((fact) => fact.status === "approved")).toHaveLength(17);
    expect(window.localStorage.getItem(ACTIVE_PACK_CACHE_KEY)).toBe("server");
  });

  it("falls back to cache read-only and blocks every mutation", async () => {
    const local = pack("local", 17);
    cacheKnowledgePack(local, true);
    const repository = new CachedKnowledgePackRepository(server({
      getActive: vi.fn(async () => { throw new Error("offline"); })
    }));
    const result = await repository.loadActive();
    expect(result).toMatchObject({ source: "cache", readOnly: true });
    await expect(repository.importAndActivate({ item: local, overwrite: true, approvalMode: "migration" })).rejects.toThrow("READ_ONLY_CACHE");
    await expect(repository.updateReview({
      packId: local.id, factIds: ["AF-018"], action: "approve", nextStatus: "approved",
      approvalMode: "single", memo: "", metadata: {}
    })).rejects.toThrow("READ_ONLY_CACHE");
    await expect(repository.updateChecklist({ packId: local.id, factId: "AF-001", metadataPatch: {} })).rejects.toThrow("READ_ONLY_CACHE");
  });

  it("preserves 17 approved facts through explicit migration import", async () => {
    const original = pack("kr-drone-license:mrm0omvd", 17);
    const remote = server();
    const repository = new CachedKnowledgePackRepository(remote);
    const imported = await repository.importAndActivate({
      item: original, overwrite: false, approvalMode: "migration", metadata: {}, audit: []
    });
    expect(imported.pack.atomicFacts.filter((fact) => fact.status === "approved")).toHaveLength(17);
    expect(remote.importAndActivate).toHaveBeenCalledWith(expect.objectContaining({ overwrite: false, approvalMode: "migration" }));
  });
});

describe("legacy audit compatibility", () => {
  it("adds nullable approvalMode and reviewedBy without rejecting old entries", () => {
    window.localStorage.setItem(LEGACY_REVIEW_AUDIT_KEY, JSON.stringify([{ factId: "AF-305", previousStatus: "draft", nextStatus: "approved", action: "approve", memo: "", timestamp: "2026-07-27T00:00:00.000Z" }]));
    expect(normalizeLegacyAudit(JSON.parse(window.localStorage.getItem(LEGACY_REVIEW_AUDIT_KEY)!))[0]).toMatchObject({
      approvalMode: null,
      reviewedBy: null,
      previousStatus: "draft",
      nextStatus: "approved"
    });
  });
});
