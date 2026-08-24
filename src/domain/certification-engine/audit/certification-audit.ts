import type { CertificationRole } from "@/domain/certification-engine/auth/certification-auth";

export type CertificationAuditEventType =
  | "FACT_REVIEW"
  | "GRAPH_REVIEW"
  | "FACT_PROMOTION"
  | "ADMIN_COMMAND"
  | "RUNTIME_CHANGE"
  | "PERMISSION_CHANGE";

export type CertificationAuditEntityType =
  | "FACT"
  | "GRAPH"
  | "PACK"
  | "USER"
  | "RUNTIME"
  | "PERMISSION"
  | "REPORT";

export type AuditContext = {
  domainId: string;
  packId: string;
  actorId: string;
  sessionId: string;
};

export type CertificationAuditEvent<TBefore = unknown, TAfter = unknown, TMetadata = Record<string, unknown>> = {
  eventId: string;
  eventType: CertificationAuditEventType;
  actorId: string;
  actorRole: CertificationRole;
  domainId: string;
  packId: string;
  entityType: CertificationAuditEntityType;
  entityId: string;
  action: string;
  beforeState: TBefore | null;
  afterState: TAfter | null;
  metadata: TMetadata;
  timestamp: string;
};

export type AuditTimeline = {
  events: CertificationAuditEvent[];
  actorHistory: Array<{
    actorId: string;
    count: number;
    firstSeenAt: string;
    lastSeenAt: string;
  }>;
  changeHistory: Array<{
    entityId: string;
    entityType: CertificationAuditEntityType;
    eventCount: number;
    lastChangedAt: string;
  }>;
};

export type AuditReportFilter = Partial<{
  domainId: string;
  packId: string;
  actorId: string;
  entityType: CertificationAuditEntityType;
  entityId: string;
  eventType: CertificationAuditEventType;
}>;
