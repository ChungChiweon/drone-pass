import type { CertificationDomainStatus, CertificationPackStatus } from "@/domain/certification-engine/certification-domain";
import type { CertificationRuntimeStatus } from "@/domain/certification-engine/runtime/certification-runtime";
import type { LearnerAnalytics } from "@/domain/exam-engine/analytics/learner-analytics";
import type { LearnerKnowledgeState } from "@/domain/exam-engine/adaptive/learner-state";
import type { KnowledgeRelation } from "@/domain/exam-engine/types";

export type BackendRecordStatus = CertificationDomainStatus | CertificationPackStatus | CertificationRuntimeStatus;

export type CertificationDomainRecord = {
  id: string;
  domainId: string;
  name: string;
  version: string;
  status: CertificationDomainStatus;
  createdAt: string;
  updatedAt: string;
};

export type CertificationPackRecord = {
  id: string;
  packId: string;
  domainId: string;
  version: string;
  status: CertificationPackStatus;
  sourceRevision: string;
  createdAt: string;
  updatedAt: string;
};

export type CertificationRuntimeRecord = {
  id: string;
  runtimeId: string;
  domainId: string;
  packId: string;
  status: CertificationRuntimeStatus;
  configVersion: string;
  createdAt: string;
};

export type CertificationProgressRecord = {
  id: string;
  userId: string;
  domainId: string;
  packId: string;
  runtimeId: string;
  learnerState: LearnerKnowledgeState[];
  analytics: LearnerAnalytics;
  adaptiveState: unknown;
  tutorState: unknown;
  updatedAt: string;
};

export type KnowledgeGraphRecord = {
  id: string;
  domainId: string;
  packId: string;
  versionId: string;
  relations: KnowledgeRelation[];
  status: "draft" | "review" | "active" | "archived";
  createdAt: string;
};

export type CertificationAuditEntityType =
  | "DOMAIN"
  | "PACK"
  | "RUNTIME"
  | "PROGRESS"
  | "GRAPH"
  | "QUESTION"
  | "FACT";

export type CertificationAuditRecord<TBefore = unknown, TAfter = unknown> = {
  id: string;
  entityType: CertificationAuditEntityType;
  entityId: string;
  action: string;
  userId: string;
  beforeState: TBefore | null;
  afterState: TAfter | null;
  createdAt: string;
};

export type CertificationIsolationKey = {
  userId?: string;
  domainId: string;
  packId: string;
};

export function createCertificationIsolationKey(input: CertificationIsolationKey) {
  return [input.userId, input.domainId, input.packId].filter(Boolean).join(":");
}
