import { describe, expect, it } from "vitest";
import type { AtomicFact, Concept, SourceDocument } from "@/domain/exam-engine/types";
import { DRONE_BASIC_EXAM_BLUEPRINT } from "@/domain/exam-engine/selection/exam-selection";
import { createCertificationEngineContext } from "./certification-engine-context";
import { DRONE_CERTIFICATION_DOMAIN, type CertificationDomain, type CertificationExamConfig, type CertificationPack } from "./certification-domain";
import { CertificationDomainRegistry, createCertificationDomainRegistry } from "./certification-domain-registry";

const sourceDocuments: SourceDocument[] = [{ id: "law", title: "항공안전법", publisher: "MOLIT", note: "" }];
const concepts: Concept[] = [{ id: "C-1", subjectId: "S-1", categoryIds: ["CAT-1"], title: "신고", summary: "" }];
const facts: AtomicFact[] = [{
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
}];

const examConfig: CertificationExamConfig = {
  examId: "drone-basic",
  examSize: 40,
  passingScore: 70,
  difficultyDistribution: { easy: 0.3, medium: 0.5, hard: 0.2 },
  categoryDistribution: [{ categoryId: "CAT-1", ratio: 1 }]
};

function pack(domainId = "kr-drone-license"): CertificationPack {
  return {
    domainId,
    packId: "pack-1",
    sourceDocuments,
    concepts,
    facts,
    questionTemplates: [],
    examBlueprints: [DRONE_BASIC_EXAM_BLUEPRINT]
  };
}

describe("certification engine core", () => {
  it("creates the Drone certification domain without moving Drone pack data", () => {
    expect(DRONE_CERTIFICATION_DOMAIN).toMatchObject({
      domainId: "kr-drone-license",
      status: "active"
    });
  });

  it("registers, retrieves, and lists domains", () => {
    const registry = new CertificationDomainRegistry();
    const boat: CertificationDomain = { domainId: "kr-boat-license", name: "Boat License", description: "Boat domain", version: "1", status: "draft" };
    registry.registerDomain(DRONE_CERTIFICATION_DOMAIN);
    registry.registerDomain(boat);

    expect(registry.getDomain("kr-drone-license")?.name).toBe("Drone Pass");
    expect(registry.listDomains().map((domain) => domain.domainId)).toEqual(["kr-boat-license", "kr-drone-license"]);
  });

  it("uses a default registry with Drone domain registered", () => {
    expect(createCertificationDomainRegistry().getDomain("kr-drone-license")).toEqual(DRONE_CERTIFICATION_DOMAIN);
  });

  it("allows multiple certification packs to coexist", () => {
    const registry = createCertificationDomainRegistry([
      DRONE_CERTIFICATION_DOMAIN,
      { domainId: "kr-boat-license", name: "Boat License", description: "Boat domain", version: "1", status: "draft" }
    ]);

    expect(registry.listDomains()).toHaveLength(2);
    expect(pack("kr-drone-license").domainId).not.toBe(pack("kr-boat-license").domainId);
  });

  it("creates certification engine context and rejects mismatched pack domains", () => {
    const context = createCertificationEngineContext({
      domain: DRONE_CERTIFICATION_DOMAIN,
      pack: pack(),
      examConfig,
      relations: [],
      activeGraphVersionId: "kg-v1"
    });

    expect(context.knowledgeGraph.activeVersionId).toBe("kg-v1");
    expect(context.learnerConfig.masteryThreshold).toBe(0.8);
    expect(() => createCertificationEngineContext({
      domain: DRONE_CERTIFICATION_DOMAIN,
      pack: pack("kr-boat-license"),
      examConfig
    })).toThrow("Certification pack domain mismatch");
  });
});
