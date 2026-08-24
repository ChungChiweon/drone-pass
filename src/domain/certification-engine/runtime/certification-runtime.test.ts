import { describe, expect, it } from "vitest";
import type { AtomicFact } from "@/domain/exam-engine/types";
import type { CertificationPack, CertificationPackDescriptor, CertificationPackVersion } from "@/domain/certification-engine/certification-domain";
import { DRONE_CERTIFICATION_DOMAIN, type CertificationDomain, type CertificationExamConfig } from "@/domain/certification-engine/certification-domain";
import { CertificationDomainRegistry } from "@/domain/certification-engine/certification-domain-registry";
import { createStaticCertificationPackLoader } from "@/domain/certification-engine/certification-pack-loader";
import { CertificationPackRegistry } from "@/domain/certification-engine/certification-pack-registry";
import { adaptRuntimeToEngineContext, getEngineBindings } from "./certification-engine-adapter";
import { loadCertificationRuntime } from "./certification-runtime-loader";
import { CertificationRuntimeRegistry } from "./certification-runtime-registry";
import { validateCertificationRuntime } from "./runtime-validator";

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

function pack(packId = "drone-pack", domainId = "kr-drone-license"): CertificationPack {
  return {
    domainId,
    packId,
    sourceDocuments: [],
    concepts: [],
    facts: [fact()],
    questionTemplates: [],
    examBlueprints: []
  };
}

function descriptor(packId = "drone-pack", domainId = "kr-drone-license"): CertificationPackDescriptor {
  return { packId, domainId, name: packId, version: "1", status: "active", createdAt: "2026-07-28T00:00:00.000Z" };
}

function version(packId = "drone-pack"): CertificationPackVersion {
  return { packId, version: "1", sourceRevision: "rev-1", createdAt: "2026-07-28T00:00:00.000Z", status: "active" };
}

async function droneRuntime() {
  return loadCertificationRuntime("kr-drone-license", "drone-pack", {
    domainRegistry: new CertificationDomainRegistry([DRONE_CERTIFICATION_DOMAIN]),
    packRegistry: new CertificationPackRegistry([descriptor()]),
    packLoader: createStaticCertificationPackLoader([pack()]),
    versions: [version()],
    examConfig,
    activeGraphVersionId: "kg-v1"
  });
}

describe("certification runtime engine", () => {
  it("creates a Drone runtime through domain, descriptor, loader, version, and context validation", async () => {
    const runtime = await droneRuntime();

    expect(runtime).toMatchObject({
      status: "ready",
      domain: { domainId: "kr-drone-license" },
      packDescriptor: { packId: "drone-pack" },
      packVersion: { sourceRevision: "rev-1" },
      knowledgeGraph: { activeVersionId: "kg-v1" }
    });
  });

  it("supports multiple active runtimes", async () => {
    const boatDomain: CertificationDomain = { domainId: "kr-boat-license", name: "Boat", description: "Boat", version: "1", status: "active" };
    const drone = await droneRuntime();
    const boat = await loadCertificationRuntime("kr-boat-license", "boat-pack", {
      domainRegistry: new CertificationDomainRegistry([DRONE_CERTIFICATION_DOMAIN, boatDomain]),
      packRegistry: new CertificationPackRegistry([descriptor("boat-pack", "kr-boat-license")]),
      packLoader: createStaticCertificationPackLoader([pack("boat-pack", "kr-boat-license")]),
      versions: [version("boat-pack")],
      examConfig
    });
    const registry = new CertificationRuntimeRegistry();

    registry.registerRuntime(drone);
    registry.registerRuntime(boat);

    expect(registry.listActiveRuntimes().map((runtime) => runtime.domain.domainId)).toEqual(["kr-boat-license", "kr-drone-license"]);
    expect(registry.getRuntimeByPack("boat-pack")?.packDescriptor.packId).toBe("boat-pack");
  });

  it("blocks invalid runtime when pack loader or version is missing", async () => {
    await expect(loadCertificationRuntime("kr-drone-license", "missing-pack", {
      domainRegistry: new CertificationDomainRegistry([DRONE_CERTIFICATION_DOMAIN]),
      packRegistry: new CertificationPackRegistry([descriptor("missing-pack")]),
      packLoader: createStaticCertificationPackLoader([]),
      versions: [],
      examConfig
    })).rejects.toThrow("Certification runtime validation failed");
  });

  it("detects domain, pack, and version mismatch", () => {
    expect(validateCertificationRuntime({
      domain: DRONE_CERTIFICATION_DOMAIN,
      packDescriptor: descriptor("drone-pack", "kr-drone-license"),
      packVersion: { ...version("drone-pack"), version: "2" },
      pack: pack("drone-pack", "kr-boat-license")
    }).errors).toEqual(expect.arrayContaining(["pack domain mismatch: kr-drone-license !== kr-boat-license", "version mismatch: 1 !== 2"]));
  });

  it("adapts runtime to existing engine binding shapes without mutating runtime", async () => {
    const runtime = await droneRuntime();
    const before = JSON.stringify(runtime);
    const engineContext = adaptRuntimeToEngineContext(runtime);
    const bindings = getEngineBindings(runtime);

    expect(engineContext.runtimeStatus).toBe("ready");
    expect(bindings.knowledgeEngine.packId).toBe("drone-pack");
    expect(bindings.tutorEngine).toEqual({ domainId: "kr-drone-license", packId: "drone-pack" });
    expect(JSON.stringify(runtime)).toBe(before);
  });
});
