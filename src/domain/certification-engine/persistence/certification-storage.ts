import type { CertificationRuntimeContext } from "@/domain/certification-engine/runtime/certification-runtime";
import type { CertificationProgressContext } from "@/domain/certification-engine/progress/certification-progress";
import type { LearnerAnalytics } from "@/domain/exam-engine/analytics/learner-analytics";

export type CertificationStorageEntityType = "RUNTIME" | "PROGRESS" | "ANALYTICS" | "GRAPH";

export type CertificationStorageRecord<TPayload = unknown> = {
  id: string;
  entityType: CertificationStorageEntityType;
  domainId: string;
  packId: string;
  userId?: string;
  payload: TPayload;
  createdAt: string;
  updatedAt: string;
};

export type CertificationStorageProvider = {
  saveRuntimeContext(context: CertificationRuntimeContext): Promise<CertificationStorageRecord<CertificationRuntimeContext>>;
  getRuntimeContext(domainId: string, packId: string): Promise<CertificationRuntimeContext | null>;
  saveProgressContext(context: CertificationProgressContext): Promise<CertificationStorageRecord<CertificationProgressContext>>;
  getProgressContext(userId: string, domainId: string, packId: string): Promise<CertificationProgressContext | null>;
  saveAnalytics(domainId: string, packId: string, userId: string, analytics: LearnerAnalytics): Promise<CertificationStorageRecord<LearnerAnalytics>>;
  getAnalytics(domainId: string, packId: string, userId: string): Promise<LearnerAnalytics | null>;
};
