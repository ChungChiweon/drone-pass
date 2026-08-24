import { describe, expect, it } from "vitest";
import { CERTIFICATION_BACKEND_MODEL_MAPPINGS, getBackendModelMapping } from "./backend-model-mapping";
import type { CertificationDomainRecord, CertificationPackRecord, CertificationProgressRecord, CertificationRuntimeRecord, KnowledgeGraphRecord } from "./certification-backend-model";
import { createCertificationIsolationKey } from "./certification-backend-model";

const now = "2026-07-29T00:00:00.000Z";

describe("certification backend data model", () => {
  it("creates domain and pack records with a stable domain-pack relation", () => {
    const domain: CertificationDomainRecord = {
      id: "domain-1",
      domainId: "kr-drone-license",
      name: "Drone Pass",
      version: "1",
      status: "active",
      createdAt: now,
      updatedAt: now
    };
    const pack: CertificationPackRecord = {
      id: "pack-1",
      packId: "kr-drone-license:mrm0omvd",
      domainId: domain.domainId,
      version: "1",
      status: "active",
      sourceRevision: "mrm0omvd",
      createdAt: now,
      updatedAt: now
    };

    expect(pack.domainId).toBe(domain.domainId);
    expect(pack.packId).toBe("kr-drone-license:mrm0omvd");
  });

  it("connects progress records to runtime using user, domain, and pack isolation", () => {
    const runtime: CertificationRuntimeRecord = {
      id: "runtime-1",
      runtimeId: "kr-drone-license:kr-drone-license:mrm0omvd:1",
      domainId: "kr-drone-license",
      packId: "kr-drone-license:mrm0omvd",
      status: "ready",
      configVersion: "1",
      createdAt: now
    };
    const progress: CertificationProgressRecord = {
      id: "progress-1",
      userId: "user-1",
      domainId: runtime.domainId,
      packId: runtime.packId,
      runtimeId: runtime.runtimeId,
      learnerState: [],
      analytics: {
        learnerId: "user-1",
        totalAttempts: 0,
        totalCorrect: 0,
        totalWrong: 0,
        accuracyRate: 0,
        weakFacts: [],
        weakConcepts: [],
        weakCategories: [],
        studyStreak: 0,
        lastStudyAt: null,
        estimatedPassProbability: 0
      },
      adaptiveState: { recommendations: [] },
      tutorState: { recommendedReviewFacts: [] },
      updatedAt: now
    };

    expect(progress.runtimeId).toBe(runtime.runtimeId);
    expect(createCertificationIsolationKey(progress)).toBe("user-1:kr-drone-license:kr-drone-license:mrm0omvd");
  });

  it("keeps user progress isolated for the same pack", () => {
    const first = createCertificationIsolationKey({ userId: "user-1", domainId: "kr-drone-license", packId: "pack-a" });
    const second = createCertificationIsolationKey({ userId: "user-2", domainId: "kr-drone-license", packId: "pack-a" });

    expect(first).not.toBe(second);
  });

  it("models graph versions separately from pack records", () => {
    const graph: KnowledgeGraphRecord = {
      id: "graph-1",
      domainId: "kr-drone-license",
      packId: "kr-drone-license:mrm0omvd",
      versionId: "kg-v1",
      relations: [],
      status: "active",
      createdAt: now
    };

    expect(graph.versionId).toBe("kg-v1");
    expect(graph.relations).toHaveLength(0);
  });

  it("maps repository entities to planned backend tables without SQL", () => {
    expect(CERTIFICATION_BACKEND_MODEL_MAPPINGS.domain.tableName).toBe("certification_domains");
    expect(CERTIFICATION_BACKEND_MODEL_MAPPINGS.pack.tableName).toBe("certification_packs");
    expect(CERTIFICATION_BACKEND_MODEL_MAPPINGS.runtime.tableName).toBe("certification_runtimes");
    expect(CERTIFICATION_BACKEND_MODEL_MAPPINGS.progress.tableName).toBe("certification_progress");
    expect(CERTIFICATION_BACKEND_MODEL_MAPPINGS.graph.tableName).toBe("certification_graph_versions");
    expect(CERTIFICATION_BACKEND_MODEL_MAPPINGS.audit.tableName).toBe("certification_audit_logs");
    expect(getBackendModelMapping("progress").isolationKeys).toEqual(["userId", "domainId", "packId"]);
  });
});
