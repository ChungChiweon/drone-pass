import type {
  CertificationDomain,
  CertificationExamConfig,
  CertificationPack,
  CertificationPackDescriptor,
  CertificationPackVersion
} from "@/domain/certification-engine/certification-domain";
import type { KnowledgeRelation } from "@/domain/exam-engine/types";

export type CertificationRuntimeStatus = "initializing" | "ready" | "failed";

export type CertificationRuntimeContext = {
  status: CertificationRuntimeStatus;
  domain: CertificationDomain;
  packDescriptor: CertificationPackDescriptor;
  packVersion: CertificationPackVersion;
  pack: CertificationPack;
  knowledgeGraph: {
    relations: KnowledgeRelation[];
    activeVersionId?: string;
  };
  examConfig: CertificationExamConfig;
  learnerConfig: {
    masteryThreshold: number;
    reviewIntervalDays: number;
  };
};
