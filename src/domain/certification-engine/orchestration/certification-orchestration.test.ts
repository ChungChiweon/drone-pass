import { describe, expect, it } from "vitest";
import type { AtomicFact } from "@/domain/exam-engine/types";
import { DRONE_CERTIFICATION_DOMAIN, type CertificationDomain, type CertificationExamConfig, type CertificationPack, type CertificationPackDescriptor, type CertificationPackVersion } from "@/domain/certification-engine/certification-domain";
import type { CertificationRuntimeContext } from "@/domain/certification-engine/runtime/certification-runtime";
import { CertificationRuntimeRegistry } from "@/domain/certification-engine/runtime/certification-runtime-registry";
import { ActiveCertificationManager } from "./active-certification-manager";
import { routeCertificationEngine, routeCertificationEngines } from "./certification-engine-router";
import { selectRuntime } from "./certification-runtime-orchestrator";
import type { CertificationUserContext } from "./certification-orchestration";

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
    subject: "장치",
    predicate: "신고",
    value: "신고",
    statement: "초경량비행장치는 신고하여야 한다",
    conditions: [],
    exceptions: [],
    sourceReferences: [{ documentId: "law", locator: "제1조" }],
    version: "1",
    status: "approved"
  };
}

function runtime(domain: CertificationDomain = DRONE_CERTIFICATION_DOMAIN, packId = "drone-pack", packStatus: CertificationPackDescriptor["status"] = "active"): CertificationRuntimeContext {
  const pack: CertificationPack = { domainId: domain.domainId, packId, sourceDocuments: [], concepts: [], facts: [fact()], questionTemplates: [], examBlueprints: [] };
  const descriptor: CertificationPackDescriptor = { packId, domainId: domain.domainId, name: packId, version: "1", status: packStatus, createdAt: "2026-07-28T00:00:00.000Z" };
  const version: CertificationPackVersion = { packId, version: "1", sourceRevision: "rev-1", createdAt: "2026-07-28T00:00:00.000Z", status: packStatus };
  return {
    status: "ready",
    domain,
    packDescriptor: descriptor,
    packVersion: version,
    pack,
    knowledgeGraph: { relations: [], activeVersionId: "kg-v1" },
    examConfig,
    learnerConfig: { masteryThreshold: 0.8, reviewIntervalDays: 7 }
  };
}

function userContext(): CertificationUserContext {
  return { userId: "user-1", activeDomainId: "", activePackId: "", activeRuntimeId: "" };
}

describe("multi certification runtime orchestration", () => {
  it("selects the Drone runtime and updates user context", () => {
    const registry = new CertificationRuntimeRegistry();
    registry.registerRuntime(runtime());

    const result = selectRuntime(userContext(), "kr-drone-license", "drone-pack", registry, "2026-07-28T00:00:00.000Z");

    expect(result.selection).toEqual({
      domainId: "kr-drone-license",
      packId: "drone-pack",
      runtimeId: "kr-drone-license:drone-pack:1",
      selectedAt: "2026-07-28T00:00:00.000Z"
    });
    expect(result.userContext.activeRuntimeId).toBe("kr-drone-license:drone-pack:1");
  });

  it("supports switching between multiple runtimes in memory", () => {
    const boatDomain: CertificationDomain = { domainId: "kr-boat-license", name: "Boat", description: "Boat", version: "1", status: "active" };
    const registry = new CertificationRuntimeRegistry();
    const manager = new ActiveCertificationManager();
    registry.registerRuntime(runtime());
    registry.registerRuntime(runtime(boatDomain, "boat-pack"));

    const drone = selectRuntime(userContext(), "kr-drone-license", "drone-pack", registry);
    manager.setActiveCertification("user-1", drone.selection);
    const boat = selectRuntime(drone.userContext, "kr-boat-license", "boat-pack", registry);
    manager.setActiveCertification("user-1", boat.selection);

    expect(manager.getActiveCertification("user-1")?.packId).toBe("boat-pack");
    expect(manager.toUserContext("user-1")?.activeDomainId).toBe("kr-boat-license");
    expect(manager.clearActiveCertification("user-1")).toBe(true);
    expect(manager.getActiveCertification("user-1")).toBeNull();
  });

  it("blocks missing, mismatched, and inactive runtimes", () => {
    const registry = new CertificationRuntimeRegistry();
    registry.registerRuntime(runtime());

    expect(() => selectRuntime(userContext(), "kr-drone-license", "missing", registry)).toThrow("Runtime missing");
    expect(() => selectRuntime(userContext(), "kr-boat-license", "drone-pack", registry)).toThrow("domain/runtime mismatch");

    const inactiveRegistry = new CertificationRuntimeRegistry();
    inactiveRegistry.registerRuntime(runtime({ ...DRONE_CERTIFICATION_DOMAIN, status: "archived" }));
    expect(() => selectRuntime(userContext(), "kr-drone-license", "drone-pack", inactiveRegistry)).toThrow("Runtime domain is not active");
  });

  it("routes runtime to engine binding surfaces", () => {
    const selected = runtime();
    const routes = routeCertificationEngines(selected);

    expect(routes.knowledgeEngine.packId).toBe("drone-pack");
    expect(routes.graphEngine.activeVersionId).toBe("kg-v1");
    expect(routeCertificationEngine(selected, "examEngine")).toEqual(examConfig);
    expect(routeCertificationEngine(selected, "tutorEngine")).toEqual({ domainId: "kr-drone-license", packId: "drone-pack" });
  });

  it("does not mutate runtime data while selecting and routing", () => {
    const selected = runtime();
    const before = JSON.stringify(selected);
    const registry = new CertificationRuntimeRegistry();
    registry.registerRuntime(selected);
    selectRuntime(userContext(), "kr-drone-license", "drone-pack", registry);
    routeCertificationEngines(selected);

    expect(JSON.stringify(selected)).toBe(before);
  });
});
