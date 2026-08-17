import type { CertificationProgressContext } from "@/domain/certification-engine/progress/certification-progress";
import type { CertificationRuntimeContext } from "@/domain/certification-engine/runtime/certification-runtime";
import type { LearnerAnalytics } from "@/domain/exam-engine/analytics/learner-analytics";
import type { CertificationStorageProvider } from "./certification-storage";

export class CertificationRepository {
  constructor(private readonly storage: CertificationStorageProvider) {}

  persistRuntime(context: CertificationRuntimeContext) {
    return this.storage.saveRuntimeContext(context);
  }

  loadRuntime(domainId: string, packId: string) {
    return this.storage.getRuntimeContext(domainId, packId);
  }

  persistProgress(context: CertificationProgressContext) {
    return this.storage.saveProgressContext(context);
  }

  loadProgress(userId: string, domainId: string, packId: string) {
    return this.storage.getProgressContext(userId, domainId, packId);
  }

  persistAnalytics(domainId: string, packId: string, userId: string, analytics: LearnerAnalytics) {
    return this.storage.saveAnalytics(domainId, packId, userId, analytics);
  }

  loadAnalytics(domainId: string, packId: string, userId: string) {
    return this.storage.getAnalytics(domainId, packId, userId);
  }
}

export function createCertificationRepository(storage: CertificationStorageProvider) {
  return new CertificationRepository(storage);
}
