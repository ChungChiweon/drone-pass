import type { CertificationProgressContext } from "@/domain/certification-engine/progress/certification-progress";
import type { CertificationRuntimeContext } from "@/domain/certification-engine/runtime/certification-runtime";
import type { LearnerAnalytics } from "@/domain/exam-engine/analytics/learner-analytics";
import type { CertificationStorageProvider, CertificationStorageRecord } from "./certification-storage";

export const CERTIFICATION_RUNTIME_KEY_PREFIX = "certification.runtime";
export const CERTIFICATION_PROGRESS_KEY_PREFIX = "certification.progress";
export const CERTIFICATION_ANALYTICS_KEY_PREFIX = "certification.analytics";

export class LocalCertificationStorageProvider implements CertificationStorageProvider {
  async saveRuntimeContext(context: CertificationRuntimeContext) {
    const record = createRecord({
      id: runtimeKey(context.domain.domainId, context.packDescriptor.packId),
      entityType: "RUNTIME" as const,
      domainId: context.domain.domainId,
      packId: context.packDescriptor.packId,
      payload: context
    });
    writeRecord(record.id, record);
    return record;
  }

  async getRuntimeContext(domainId: string, packId: string) {
    return readRecord<CertificationRuntimeContext>(runtimeKey(domainId, packId))?.payload ?? null;
  }

  async saveProgressContext(context: CertificationProgressContext) {
    const record = createRecord({
      id: progressKey(context.userId, context.domainId, context.packId),
      entityType: "PROGRESS" as const,
      domainId: context.domainId,
      packId: context.packId,
      userId: context.userId,
      payload: context
    });
    writeRecord(record.id, record);
    return record;
  }

  async getProgressContext(userId: string, domainId: string, packId: string) {
    return readRecord<CertificationProgressContext>(progressKey(userId, domainId, packId))?.payload ?? null;
  }

  async saveAnalytics(domainId: string, packId: string, userId: string, analytics: LearnerAnalytics) {
    const record = createRecord({
      id: analyticsKey(userId, domainId, packId),
      entityType: "ANALYTICS" as const,
      domainId,
      packId,
      userId,
      payload: analytics
    });
    writeRecord(record.id, record);
    return record;
  }

  async getAnalytics(domainId: string, packId: string, userId: string) {
    return readRecord<LearnerAnalytics>(analyticsKey(userId, domainId, packId))?.payload ?? null;
  }
}

function runtimeKey(domainId: string, packId: string) {
  return `${CERTIFICATION_RUNTIME_KEY_PREFIX}.${domainId}.${packId}`;
}

function progressKey(userId: string, domainId: string, packId: string) {
  return `${CERTIFICATION_PROGRESS_KEY_PREFIX}.${userId}.${domainId}.${packId}`;
}

function analyticsKey(userId: string, domainId: string, packId: string) {
  return `${CERTIFICATION_ANALYTICS_KEY_PREFIX}.${userId}.${domainId}.${packId}`;
}

function createRecord<TPayload>(input: Omit<CertificationStorageRecord<TPayload>, "createdAt" | "updatedAt">): CertificationStorageRecord<TPayload> {
  const existing = readRecord<TPayload>(input.id);
  const now = new Date().toISOString();
  return {
    ...input,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function writeRecord<TPayload>(key: string, record: CertificationStorageRecord<TPayload>) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(record));
}

function readRecord<TPayload>(key: string): CertificationStorageRecord<TPayload> | null {
  if (!canUseStorage()) return null;
  try {
    const value = window.localStorage.getItem(key);
    if (!value) return null;
    return JSON.parse(value) as CertificationStorageRecord<TPayload>;
  } catch {
    return null;
  }
}
