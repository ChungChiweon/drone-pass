import type { CertificationStorageEntityType, CertificationStorageRecord } from "./certification-storage";

export type BackendStoragePermission = "READ" | "WRITE" | "ADMIN";

export type BackendStorageContext = {
  userId: string;
  domainId: string;
  packId: string;
  permissions: BackendStoragePermission[];
};

export type BackendRecordQuery = {
  entityType?: CertificationStorageEntityType;
  domainId?: string;
  packId?: string;
  userId?: string;
};

export type BackendCertificationStorageProvider = {
  saveRecord<TPayload>(context: BackendStorageContext, record: CertificationStorageRecord<TPayload>): Promise<CertificationStorageRecord<TPayload>>;
  getRecord<TPayload>(context: BackendStorageContext, id: string): Promise<CertificationStorageRecord<TPayload> | null>;
  listRecords<TPayload>(context: BackendStorageContext, query?: BackendRecordQuery): Promise<Array<CertificationStorageRecord<TPayload>>>;
  deleteRecord(context: BackendStorageContext, id: string): Promise<void>;
};
