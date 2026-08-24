import { describe, expect, it } from "vitest";
import type { AtomicFact, KnowledgePack } from "@/domain/exam-engine/types";
import { createCertificationEngineContext } from "./certification-engine-context";
import { DRONE_CERTIFICATION_DOMAIN, type CertificationExamConfig, type CertificationPackDescriptor } from "./certification-domain";
import { createStaticCertificationPackLoader } from "./certification-pack-loader";
import { CertificationPackRegistry } from "./certification-pack-registry";
import { adaptDroneKnowledgePack } from "./drone-pack-adapter";

const examConfig: CertificationExamConfig = {
  examId: "drone-basic",
  examSize: 40,
  passingScore: 70,
  difficultyDistribution: { easy: 0.3, medium: 0.5, hard: 0.2 },
  categoryDistribution: []
};

function fact(overrides: Partial<AtomicFact> = {}): AtomicFact {
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
    status: "approved",
    ...overrides
  };
}

function droneKnowledgePack(): KnowledgePack {
  return {
    domainPack: { exams: [], subjects: [], categories: [] },
    sourceDocuments: [{ id: "law", title: "항공안전법", publisher: "MOLIT", note: "" }],
    sourceRevisions: [{ id: "rev-1", documentId: "law", label: "2026" }],
    concepts: [{ id: "C-1", subjectId: "S-1", categoryIds: [], title: "신고", summary: "" }],
    atomicFacts: [fact()],
    questionTemplates: [],
    distractorRules: []
  };
}

describe("multi certification pack architecture", () => {
  it("registers and queries packs across multiple domains", () => {
    const registry = new CertificationPackRegistry();
    const drone: CertificationPackDescriptor = { packId: "drone-pack", domainId: "kr-drone-license", name: "Drone", version: "1", status: "active", createdAt: "2026-07-28T00:00:00.000Z" };
    const boat: CertificationPackDescriptor = { packId: "boat-pack", domainId: "kr-boat-license", name: "Boat", version: "1", status: "draft", createdAt: "2026-07-28T00:00:00.000Z" };

    registry.registerPack(drone);
    registry.registerPack(boat);

    expect(registry.getPack("drone-pack")).toEqual(drone);
    expect(registry.getPacksByDomain("kr-drone-license")).toEqual([drone]);
    expect(registry.listPacks().map((pack) => pack.packId)).toEqual(["boat-pack", "drone-pack"]);
  });

  it("loads packs through the loader interface", async () => {
    const adapted = adaptDroneKnowledgePack({ packId: "drone-pack", name: "Drone", version: "1", knowledgePack: droneKnowledgePack(), createdAt: "2026-07-28T00:00:00.000Z" });
    const loader = createStaticCertificationPackLoader([adapted.pack]);

    await expect(loader.loadPack("drone-pack")).resolves.toEqual(adapted.pack);
    await expect(loader.loadPack("missing")).resolves.toBeNull();
  });

  it("adapts the Drone KnowledgePack without mutating it", () => {
    const source = droneKnowledgePack();
    const before = JSON.stringify(source);
    const adapted = adaptDroneKnowledgePack({ packId: "drone-pack", name: "Drone", version: "1", knowledgePack: source, createdAt: "2026-07-28T00:00:00.000Z" });

    expect(adapted.descriptor).toMatchObject({ packId: "drone-pack", domainId: "kr-drone-license", status: "active" });
    expect(adapted.version).toMatchObject({ packId: "drone-pack", version: "1", sourceRevision: "rev-1" });
    expect(adapted.pack.facts).toEqual(source.atomicFacts);
    expect(JSON.stringify(source)).toBe(before);
  });

  it("connects descriptor and version to engine context", () => {
    const adapted = adaptDroneKnowledgePack({ packId: "drone-pack", name: "Drone", version: "1", knowledgePack: droneKnowledgePack(), createdAt: "2026-07-28T00:00:00.000Z" });
    const context = createCertificationEngineContext({
      domain: DRONE_CERTIFICATION_DOMAIN,
      pack: adapted.pack,
      packDescriptor: adapted.descriptor,
      packVersion: adapted.version,
      examConfig
    });

    expect(context.packDescriptor?.packId).toBe("drone-pack");
    expect(context.packVersion?.sourceRevision).toBe("rev-1");
  });
});
