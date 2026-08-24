import type { CertificationDomain, CertificationEngineContext, CertificationExamConfig, CertificationPack, CertificationPackDescriptor, CertificationPackVersion } from "./certification-domain";
import type { KnowledgeRelation } from "@/domain/exam-engine/types";

export function createCertificationEngineContext(input: {
  domain: CertificationDomain;
  pack: CertificationPack;
  packDescriptor?: CertificationPackDescriptor;
  packVersion?: CertificationPackVersion;
  relations?: KnowledgeRelation[];
  activeGraphVersionId?: string;
  examConfig: CertificationExamConfig;
  learnerConfig?: CertificationEngineContext["learnerConfig"];
}): CertificationEngineContext {
  if (input.domain.domainId !== input.pack.domainId) {
    throw new Error(`Certification pack domain mismatch: ${input.pack.domainId} !== ${input.domain.domainId}`);
  }
  return {
    domain: input.domain,
    pack: input.pack,
    packDescriptor: input.packDescriptor,
    packVersion: input.packVersion,
    knowledgeGraph: {
      relations: input.relations ?? [],
      activeVersionId: input.activeGraphVersionId
    },
    examConfig: input.examConfig,
    learnerConfig: input.learnerConfig ?? {
      masteryThreshold: 0.8,
      reviewIntervalDays: 7
    }
  };
}
