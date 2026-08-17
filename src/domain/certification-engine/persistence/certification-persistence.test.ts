// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { DRONE_CERTIFICATION_DOMAIN, type CertificationExamConfig, type CertificationPack, type CertificationPackDescriptor, type CertificationPackVersion } from "@/domain/certification-engine/certification-domain";
import type { CertificationProgressContext } from "@/domain/certification-engine/progress/certification-progress";
import type { CertificationRuntimeContext } from "@/domain/certification-engine/runtime/certification-runtime";
import type { LearnerAnalytics } from "@/domain/exam-engine/analytics/learner-analytics";
import type { AtomicFact } from "@/domain/exam-engine/types";
import { createCertificationRepository } from "./certification-repository";
import type { CertificationStorageProvider } from "./certification-storage";
import { LocalCertificationStorageProvider } from "./local-certification-storage";
import { createStorageMigrationPlan } from "./storage-migration";

const examConfig: CertificationExamConfig = {
  examId: "basic",
  examSize: 40,
  passingScore: 70,
  difficultyDistribution: { easy: 0.3, medium: 0.5, hard: 0.2 },
  categoryDistribution: []
};

function fact(): AtomicFact {
  return {
    id: "AF-001",
    conceptId: "C-1",
    subject: "drone-operator",
    predicate: "must-report",
    value: "report-required",
    statement: "A drone operator must complete the required report.",
    conditions: [],
    exceptions: [],
    sourceReferences: [{ documentId: "law", locator: "Article 1" }],
    version: "1",
    status: "approved"
  };
}

function runtime(packId = "drone-pack"): CertificationRuntimeContext {
  const pack: CertificationPack = { domainId: DRONE_CERTIFICATION_DOMAIN.domainId, packId, sourceDocuments: [], concepts: [], facts: [fact()], questionTemplates: [], examBlueprints: [] };
  const packDescriptor: CertificationPackDescriptor = { packId, domainId: DRONE_CERTIFICATION_DOMAIN.domainId, name: packId, version: "1", status: "active", createdAt: "2026-07-29T00:00:00.000Z" };
  const packVersion: CertificationPackVersion = { packId, version: "1", sourceRevision: "rev-1", createdAt: "2026-07-29T00:00:00.000Z", status: "active" };
  return {
    status: "ready",
    domain: DRONE_CERTIFICATION_DOMAIN,
    packDescriptor,
    packVersion,
    pack,
    knowledgeGraph: { relations: [], activeVersionId: "kg-v1" },
    examConfig,
    learnerConfig: { masteryThreshold: 0.8, reviewIntervalDays: 7 }
  };
}

function analytics(userId = "user-1"): LearnerAnalytics {
  return {
    learnerId: userId,
    totalAttempts: 2,
    totalCorrect: 1,
    totalWrong: 1,
    accuracyRate: 0.5,
    weakFacts: [{ id: "AF-001", wrongRate: 0.5, attemptCount: 2, masteryScore: 0.4, priorityScore: 0.8 }],
    weakConcepts: [],
    weakCategories: [],
    studyStreak: 1,
    lastStudyAt: "2026-07-29T00:00:00.000Z",
    estimatedPassProbability: 0.5
  };
}

function progress(userId = "user-1", packId = "drone-pack"): CertificationProgressContext {
  return {
    userId,
    domainId: DRONE_CERTIFICATION_DOMAIN.domainId,
    packId,
    runtimeId: `${DRONE_CERTIFICATION_DOMAIN.domainId}:${packId}:1`,
    learnerStates: [],
    analytics: analytics(userId),
    adaptiveState: { recommendations: [], lastCalculatedAt: null },
    tutorState: { weakFacts: ["AF-001"], learningHistory: ["Q-1"], recommendedReviewFacts: ["AF-001"] }
  };
}

describe("certification persistence architecture", () => {
  beforeEach(() => window.localStorage.clear());

  it("saves and loads runtime context by domain and pack", async () => {
    const repository = createCertificationRepository(new LocalCertificationStorageProvider());
    await repository.persistRuntime(runtime());

    await expect(repository.loadRuntime("kr-drone-license", "drone-pack")).resolves.toMatchObject({
      packDescriptor: { packId: "drone-pack" },
      knowledgeGraph: { activeVersionId: "kg-v1" }
    });
  });

  it("saves and loads progress with user/domain/pack isolation", async () => {
    const repository = createCertificationRepository(new LocalCertificationStorageProvider());
    await repository.persistProgress(progress("user-1", "drone-pack"));
    await repository.persistProgress(progress("user-1", "boat-pack"));
    await repository.persistProgress(progress("user-2", "drone-pack"));

    expect((await repository.loadProgress("user-1", "kr-drone-license", "drone-pack"))?.packId).toBe("drone-pack");
    expect((await repository.loadProgress("user-1", "kr-drone-license", "boat-pack"))?.packId).toBe("boat-pack");
    expect((await repository.loadProgress("user-2", "kr-drone-license", "drone-pack"))?.userId).toBe("user-2");
  });

  it("saves and loads analytics independently from progress", async () => {
    const repository = createCertificationRepository(new LocalCertificationStorageProvider());
    await repository.persistAnalytics("kr-drone-license", "drone-pack", "user-1", analytics());

    await expect(repository.loadAnalytics("kr-drone-license", "drone-pack", "user-1")).resolves.toMatchObject({
      learnerId: "user-1",
      totalAttempts: 2
    });
    await expect(repository.loadProgress("user-1", "kr-drone-license", "drone-pack")).resolves.toBeNull();
  });

  it("allows storage provider replacement through repository interface", async () => {
    const memory = new Map<string, unknown>();
    const provider: CertificationStorageProvider = {
      async saveRuntimeContext(context) {
        memory.set("runtime", context);
        return { id: "runtime", entityType: "RUNTIME", domainId: context.domain.domainId, packId: context.packDescriptor.packId, payload: context, createdAt: "", updatedAt: "" };
      },
      async getRuntimeContext() {
        return (memory.get("runtime") as CertificationRuntimeContext | undefined) ?? null;
      },
      async saveProgressContext(context) {
        memory.set("progress", context);
        return { id: "progress", entityType: "PROGRESS", domainId: context.domainId, packId: context.packId, userId: context.userId, payload: context, createdAt: "", updatedAt: "" };
      },
      async getProgressContext() {
        return (memory.get("progress") as CertificationProgressContext | undefined) ?? null;
      },
      async saveAnalytics(domainId, packId, userId, value) {
        memory.set("analytics", value);
        return { id: "analytics", entityType: "ANALYTICS", domainId, packId, userId, payload: value, createdAt: "", updatedAt: "" };
      },
      async getAnalytics() {
        return (memory.get("analytics") as LearnerAnalytics | undefined) ?? null;
      }
    };
    const repository = createCertificationRepository(provider);

    await repository.persistRuntime(runtime());
    await expect(repository.loadRuntime("kr-drone-license", "drone-pack")).resolves.toMatchObject({ status: "ready" });
  });

  it("creates localStorage to Supabase migration plans without executing migration", () => {
    expect(createStorageMigrationPlan({
      source: "localStorage",
      target: "supabase",
      entityType: "PROGRESS",
      version: "1"
    })).toEqual({
      source: "localStorage",
      target: "supabase",
      entityType: "PROGRESS",
      version: "1"
    });
  });
});
