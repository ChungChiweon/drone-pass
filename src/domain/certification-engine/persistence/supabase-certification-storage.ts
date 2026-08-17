import type { CertificationProgressContext } from "@/domain/certification-engine/progress/certification-progress";
import type { CertificationRuntimeContext } from "@/domain/certification-engine/runtime/certification-runtime";
import type { LearnerAnalytics } from "@/domain/exam-engine/analytics/learner-analytics";
import type { CertificationStorageProvider, CertificationStorageRecord } from "./certification-storage";

export class SupabaseCertificationStorageProvider implements CertificationStorageProvider {
  async saveRuntimeContext(context: CertificationRuntimeContext): Promise<CertificationStorageRecord<CertificationRuntimeContext>> {
    void context;
    throw notConnectedError();
  }

  async getRuntimeContext(domainId: string, packId: string): Promise<CertificationRuntimeContext | null> {
    void domainId;
    void packId;
    throw notConnectedError();
  }

  async saveProgressContext(context: CertificationProgressContext): Promise<CertificationStorageRecord<CertificationProgressContext>> {
    void context;
    throw notConnectedError();
  }

  async getProgressContext(userId: string, domainId: string, packId: string): Promise<CertificationProgressContext | null> {
    void userId;
    void domainId;
    void packId;
    throw notConnectedError();
  }

  async saveAnalytics(domainId: string, packId: string, userId: string, analytics: LearnerAnalytics): Promise<CertificationStorageRecord<LearnerAnalytics>> {
    void domainId;
    void packId;
    void userId;
    void analytics;
    throw notConnectedError();
  }

  async getAnalytics(domainId: string, packId: string, userId: string): Promise<LearnerAnalytics | null> {
    void domainId;
    void packId;
    void userId;
    throw notConnectedError();
  }
}

function notConnectedError() {
  return new Error("SupabaseCertificationStorageProvider is a stub. Supabase SDK calls are intentionally not connected yet.");
}
