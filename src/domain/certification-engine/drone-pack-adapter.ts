import type { KnowledgePack } from "@/domain/exam-engine/types";
import { DRONE_BASIC_EXAM_BLUEPRINT } from "@/domain/exam-engine/selection/exam-selection";
import type { CertificationPack, CertificationPackDescriptor, CertificationPackVersion } from "./certification-domain";
import { DRONE_CERTIFICATION_DOMAIN } from "./certification-domain";

export function adaptDroneKnowledgePack(input: {
  packId: string;
  name: string;
  version: string;
  knowledgePack: KnowledgePack;
  createdAt: string;
}): {
  descriptor: CertificationPackDescriptor;
  version: CertificationPackVersion;
  pack: CertificationPack;
} {
  return {
    descriptor: {
      packId: input.packId,
      domainId: DRONE_CERTIFICATION_DOMAIN.domainId,
      name: input.name,
      version: input.version,
      status: "active",
      createdAt: input.createdAt
    },
    version: {
      packId: input.packId,
      version: input.version,
      sourceRevision: input.knowledgePack.sourceRevisions.at(-1)?.id ?? "unknown",
      createdAt: input.createdAt,
      status: "active"
    },
    pack: {
      domainId: DRONE_CERTIFICATION_DOMAIN.domainId,
      packId: input.packId,
      sourceDocuments: input.knowledgePack.sourceDocuments,
      concepts: input.knowledgePack.concepts,
      facts: input.knowledgePack.atomicFacts,
      questionTemplates: input.knowledgePack.questionTemplates,
      examBlueprints: [DRONE_BASIC_EXAM_BLUEPRINT]
    }
  };
}
