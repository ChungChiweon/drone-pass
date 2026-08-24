import type { CertificationAuditRecord, KnowledgeGraphRecord } from "@/domain/certification-engine/backend-model/certification-backend-model";
import type { CertificationDomainRegistry } from "@/domain/certification-engine/certification-domain-registry";
import type { CertificationPackRegistry } from "@/domain/certification-engine/certification-pack-registry";
import type { CertificationRepository } from "@/domain/certification-engine/persistence/certification-repository";
import type { CertificationStorageProvider } from "@/domain/certification-engine/persistence/certification-storage";
import type { BackendStorageContext } from "@/domain/certification-engine/persistence/backend-certification-storage";
import type { StorageAccessAction, StorageAccessResult } from "@/domain/certification-engine/persistence/storage-access-control";
import type { CertificationRuntimeRegistry } from "@/domain/certification-engine/runtime/certification-runtime-registry";

export type CertificationServiceAccessControl = {
  context: BackendStorageContext;
  validate(action: StorageAccessAction, scope?: { domainId?: string; packId?: string; userId?: string }): StorageAccessResult;
};

export type CertificationServiceContext = {
  storageProvider: CertificationStorageProvider;
  runtimeRegistry: CertificationRuntimeRegistry;
  repository: CertificationRepository;
  accessControl: CertificationServiceAccessControl;
  domainRegistry?: CertificationDomainRegistry;
  packRegistry?: CertificationPackRegistry;
  graphRecords?: KnowledgeGraphRecord[];
  auditRecords?: CertificationAuditRecord[];
};
