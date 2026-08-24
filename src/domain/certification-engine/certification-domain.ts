import type {
  AtomicFact,
  Concept,
  KnowledgeRelation,
  QuestionTemplate,
  SourceDocument
} from "@/domain/exam-engine/types";
import type { ExamBlueprint } from "@/domain/exam-engine/selection/exam-selection";

export type CertificationDomainStatus = "draft" | "active" | "archived";

export type CertificationDomain = {
  domainId: string;
  name: string;
  description: string;
  version: string;
  status: CertificationDomainStatus;
};

export type CertificationPack = {
  domainId: string;
  packId: string;
  sourceDocuments: SourceDocument[];
  concepts: Concept[];
  facts: AtomicFact[];
  questionTemplates: QuestionTemplate[];
  examBlueprints: ExamBlueprint[];
};

export type CertificationPackStatus = "draft" | "active" | "archived";

export type CertificationPackDescriptor = {
  packId: string;
  domainId: string;
  name: string;
  version: string;
  status: CertificationPackStatus;
  createdAt: string;
};

export type CertificationPackVersion = {
  packId: string;
  version: string;
  sourceRevision: string;
  createdAt: string;
  status: CertificationPackStatus;
};

export type CertificationExamConfig = {
  examId: string;
  examSize: number;
  passingScore: number;
  difficultyDistribution: {
    easy: number;
    medium: number;
    hard: number;
  };
  categoryDistribution: Array<{
    categoryId: string;
    ratio: number;
  }>;
};

export type CertificationEngineContext = {
  domain: CertificationDomain;
  pack: CertificationPack;
  packDescriptor?: CertificationPackDescriptor;
  packVersion?: CertificationPackVersion;
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

export const DRONE_CERTIFICATION_DOMAIN: CertificationDomain = {
  domainId: "kr-drone-license",
  name: "Drone Pass",
  description: "Korean drone license certification intelligence domain.",
  version: "1",
  status: "active"
};
