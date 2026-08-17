// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import type { CertificationServiceContext } from "./certification-service-context";
import { createCertificationServices } from "./certification-service-factory";
import { createCertificationApiError, createCertificationApiResponse, type CertificationApiRequest } from "@/domain/certification-engine/api/certification-api-boundary";
import type { KnowledgeGraphRecord } from "@/domain/certification-engine/backend-model/certification-backend-model";
import { DRONE_CERTIFICATION_DOMAIN, type CertificationExamConfig, type CertificationPack, type CertificationPackDescriptor, type CertificationPackVersion } from "@/domain/certification-engine/certification-domain";
import { createCertificationDomainRegistry } from "@/domain/certification-engine/certification-domain-registry";
import { createCertificationPackRegistry } from "@/domain/certification-engine/certification-pack-registry";
import { createCertificationRepository } from "@/domain/certification-engine/persistence/certification-repository";
import { LocalCertificationStorageProvider } from "@/domain/certification-engine/persistence/local-certification-storage";
import { validateStorageAccess } from "@/domain/certification-engine/persistence/storage-access-control";
import type { CertificationProgressContext } from "@/domain/certification-engine/progress/certification-progress";
import type { CertificationRuntimeContext } from "@/domain/certification-engine/runtime/certification-runtime";
import { CertificationRuntimeRegistry } from "@/domain/certification-engine/runtime/certification-runtime-registry";
import type { LearnerAnalytics } from "@/domain/exam-engine/analytics/learner-analytics";
import type { AtomicFact } from "@/domain/exam-engine/types";

const now = "2026-07-29T00:00:00.000Z";
const packId = "kr-drone-license:mrm0omvd";
const runtimeId = `${DRONE_CERTIFICATION_DOMAIN.domainId}:${packId}:1`;

const examConfig: CertificationExamConfig = {
  examId: "drone-basic",
  examSize: 40,
  passingScore: 70,
  difficultyDistribution: { easy: 0.3, medium: 0.5, hard: 0.2 },
  categoryDistribution: []
};

function fact(): AtomicFact {
  return {
    id: "AF-001",
    conceptId: "C-1",
    subject: "operator",
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

function analytics(userId = "user-1"): LearnerAnalytics {
  return {
    learnerId: userId,
    totalAttempts: 1,
    totalCorrect: 1,
    totalWrong: 0,
    accuracyRate: 1,
    weakFacts: [],
    weakConcepts: [],
    weakCategories: [],
    studyStreak: 1,
    lastStudyAt: now,
    estimatedPassProbability: 0.8
  };
}

function progress(userId = "user-1"): CertificationProgressContext {
  return {
    userId,
    domainId: DRONE_CERTIFICATION_DOMAIN.domainId,
    packId,
    runtimeId,
    learnerStates: [],
    analytics: analytics(userId),
    adaptiveState: { recommendations: [], lastCalculatedAt: null },
    tutorState: { weakFacts: [], learningHistory: [], recommendedReviewFacts: [] }
  };
}

function runtime(): CertificationRuntimeContext {
  const packDescriptor: CertificationPackDescriptor = {
    packId,
    domainId: DRONE_CERTIFICATION_DOMAIN.domainId,
    name: "Drone Pack",
    version: "1",
    status: "active",
    createdAt: now
  };
  const packVersion: CertificationPackVersion = {
    packId,
    version: "1",
    sourceRevision: "mrm0omvd",
    createdAt: now,
    status: "active"
  };
  const pack: CertificationPack = {
    domainId: DRONE_CERTIFICATION_DOMAIN.domainId,
    packId,
    sourceDocuments: [],
    concepts: [],
    facts: [fact()],
    questionTemplates: [],
    examBlueprints: []
  };
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

function serviceContext(permissions: Array<"READ" | "WRITE" | "ADMIN"> = ["READ", "WRITE"]): CertificationServiceContext {
  const storageProvider = new LocalCertificationStorageProvider();
  const repository = createCertificationRepository(storageProvider);
  const runtimeRegistry = new CertificationRuntimeRegistry();
  runtimeRegistry.registerRuntime(runtime());
  const graphRecords: KnowledgeGraphRecord[] = [{
    id: "graph-1",
    domainId: DRONE_CERTIFICATION_DOMAIN.domainId,
    packId,
    versionId: "kg-v1",
    relations: [],
    status: "active",
    createdAt: now
  }];
  const accessContext = {
    userId: "user-1",
    domainId: DRONE_CERTIFICATION_DOMAIN.domainId,
    packId,
    permissions
  };
  return {
    storageProvider,
    repository,
    runtimeRegistry,
    domainRegistry: createCertificationDomainRegistry([DRONE_CERTIFICATION_DOMAIN]),
    packRegistry: createCertificationPackRegistry([runtime().packDescriptor]),
    graphRecords,
    auditRecords: [],
    accessControl: {
      context: accessContext,
      validate(action, scope = {}) {
        return validateStorageAccess(accessContext, action, {
          domainId: scope.domainId ?? accessContext.domainId,
          packId: scope.packId ?? accessContext.packId,
          userId: scope.userId
        });
      }
    }
  };
}

describe("certification backend service layer", () => {
  beforeEach(() => window.localStorage.clear());

  it("creates services with injected context and registry-backed lookups", async () => {
    const services = createCertificationServices(serviceContext());

    await expect(services.domainService.getDomain("kr-drone-license")).resolves.toMatchObject({ name: "Drone Pass" });
    await expect(services.packService.getPack(packId)).resolves.toMatchObject({ packId });
    await expect(services.runtimeService.getRuntime(runtimeId)).resolves.toMatchObject({ packDescriptor: { packId } });
  });

  it("keeps progress access behind repository and access control", async () => {
    const services = createCertificationServices(serviceContext());

    await services.progressService.updateProgress(progress("user-1"));
    await expect(services.progressService.getProgress("user-1", packId)).resolves.toMatchObject({ userId: "user-1", packId });
  });

  it("blocks progress updates when write permission is missing", async () => {
    const services = createCertificationServices(serviceContext(["READ"]));

    await expect(services.progressService.updateProgress(progress("user-1"))).rejects.toThrow("Missing WRITE permission");
  });

  it("exposes graph and audit service boundaries without a database", async () => {
    const services = createCertificationServices(serviceContext());

    await expect(services.graphService.getActiveGraph(packId)).resolves.toMatchObject({ versionId: "kg-v1" });
    await services.auditService.recordAudit({
      id: "audit-1",
      entityType: "PROGRESS",
      entityId: "progress-1",
      action: "UPDATE_PROGRESS",
      userId: "user-1",
      beforeState: null,
      afterState: { packId },
      createdAt: now
    });
    await expect(services.auditService.getAuditHistory("progress-1")).resolves.toHaveLength(1);
  });

  it("defines API request and response boundary shapes", () => {
    const request: CertificationApiRequest<{ factId: string }> = {
      userId: "user-1",
      domainId: "kr-drone-license",
      packId,
      action: "GET_PROGRESS",
      payload: { factId: "AF-001" }
    };

    expect(request.payload.factId).toBe("AF-001");
    expect(createCertificationApiResponse({ ok: true })).toEqual({ success: true, data: { ok: true } });
    expect(createCertificationApiError("blocked")).toEqual({ success: false, error: "blocked" });
  });
});
