import type { CertificationProgressContext } from "@/domain/certification-engine/progress/certification-progress";
import type { CertificationRuntimeContext } from "@/domain/certification-engine/runtime/certification-runtime";
import type { LearnerAnalytics } from "@/domain/exam-engine/analytics/learner-analytics";
import type { BackendCertificationStorageProvider, BackendStorageContext } from "./backend-certification-storage";
import type { CertificationStorageProvider, CertificationStorageRecord } from "./certification-storage";

export class BackendCertificationStorageAdapter implements CertificationStorageProvider {
  constructor(
    private readonly backend: BackendCertificationStorageProvider,
    private readonly context: BackendStorageContext
  ) {}

  async saveRuntimeContext(context: CertificationRuntimeContext) {
    return this.backend.saveRecord(this.context, createRecord({
      id: runtimeRecordId(context.domain.domainId, context.packDescriptor.packId),
      entityType: "RUNTIME",
      domainId: context.domain.domainId,
      packId: context.packDescriptor.packId,
      payload: context
    }));
  }

  async getRuntimeContext(domainId: string, packId: string) {
    const record = await this.backend.getRecord<CertificationRuntimeContext>(this.context, runtimeRecordId(domainId, packId));
    return record?.payload ?? null;
  }

  async saveProgressContext(context: CertificationProgressContext) {
    return this.backend.saveRecord(this.context, createRecord({
      id: progressRecordId(context.userId, context.domainId, context.packId),
      entityType: "PROGRESS",
      domainId: context.domainId,
      packId: context.packId,
      userId: context.userId,
      payload: context
    }));
  }

  async getProgressContext(userId: string, domainId: string, packId: string) {
    const record = await this.backend.getRecord<CertificationProgressContext>(this.context, progressRecordId(userId, domainId, packId));
    return record?.payload ?? null;
  }

  async saveAnalytics(domainId: string, packId: string, userId: string, analytics: LearnerAnalytics) {
    return this.backend.saveRecord(this.context, createRecord({
      id: analyticsRecordId(userId, domainId, packId),
      entityType: "ANALYTICS",
      domainId,
      packId,
      userId,
      payload: analytics
    }));
  }

  async getAnalytics(domainId: string, packId: string, userId: string) {
    const record = await this.backend.getRecord<LearnerAnalytics>(this.context, analyticsRecordId(userId, domainId, packId));
    return record?.payload ?? null;
  }
}

export function runtimeRecordId(domainId: string, packId: string) {
  return `certification.runtime.${domainId}.${packId}`;
}

export function progressRecordId(userId: string, domainId: string, packId: string) {
  return `certification.progress.${userId}.${domainId}.${packId}`;
}

export function analyticsRecordId(userId: string, domainId: string, packId: string) {
  return `certification.analytics.${userId}.${domainId}.${packId}`;
}

function createRecord<TPayload>(input: Omit<CertificationStorageRecord<TPayload>, "createdAt" | "updatedAt">): CertificationStorageRecord<TPayload> {
  const now = new Date().toISOString();
  return { ...input, createdAt: now, updatedAt: now };
}
