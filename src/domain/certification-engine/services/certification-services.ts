import type { CertificationAuditRecord, KnowledgeGraphRecord } from "@/domain/certification-engine/backend-model/certification-backend-model";
import type { CertificationDomain, CertificationPackDescriptor } from "@/domain/certification-engine/certification-domain";
import type { CertificationProgressContext } from "@/domain/certification-engine/progress/certification-progress";
import type { CertificationRuntimeContext } from "@/domain/certification-engine/runtime/certification-runtime";

export type CertificationDomainService = {
  getDomain(domainId: string): Promise<CertificationDomain | null>;
  listDomains(): Promise<CertificationDomain[]>;
};

export type CertificationPackService = {
  getPack(packId: string): Promise<CertificationPackDescriptor | null>;
  listPacks(domainId: string): Promise<CertificationPackDescriptor[]>;
};

export type CertificationRuntimeService = {
  getRuntime(runtimeId: string): Promise<CertificationRuntimeContext | null>;
  activateRuntime(runtimeId: string): Promise<CertificationRuntimeContext | null>;
};

export type CertificationProgressService = {
  getProgress(userId: string, packId: string): Promise<CertificationProgressContext | null>;
  updateProgress(context: CertificationProgressContext): Promise<CertificationProgressContext>;
};

export type CertificationGraphService = {
  getActiveGraph(packId: string): Promise<KnowledgeGraphRecord | null>;
  getGraphVersion(versionId: string): Promise<KnowledgeGraphRecord | null>;
};

export type CertificationAuditService = {
  recordAudit(record: CertificationAuditRecord): Promise<CertificationAuditRecord>;
  getAuditHistory(entityId: string): Promise<CertificationAuditRecord[]>;
};

export type CertificationServices = {
  domainService: CertificationDomainService;
  packService: CertificationPackService;
  runtimeService: CertificationRuntimeService;
  progressService: CertificationProgressService;
  graphService: CertificationGraphService;
  auditService: CertificationAuditService;
};
