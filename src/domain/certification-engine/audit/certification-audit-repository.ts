import type { AuditReportFilter, CertificationAuditEvent } from "./certification-audit";
import type { ComplianceReport } from "./audit-compliance-report";

export type AuditTimelineScope = Partial<{
  domainId: string;
  packId: string;
  actorId: string;
  entityId: string;
}>;

export type CertificationAuditRepository = {
  appendEvent(event: CertificationAuditEvent): Promise<CertificationAuditEvent>;
  getEvents(entityId: string): Promise<CertificationAuditEvent[]>;
  getTimeline(scope: AuditTimelineScope): Promise<CertificationAuditEvent[]>;
  getAuditReport(filter: AuditReportFilter): Promise<ComplianceReport>;
};
