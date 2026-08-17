import type { AuditReportFilter, CertificationAuditEvent } from "./certification-audit";
import { findRiskEvents } from "./audit-risk-analyzer";

export type ComplianceReport = {
  scope: AuditReportFilter;
  totalEvents: number;
  actors: string[];
  changedEntities: string[];
  riskEvents: ReturnType<typeof findRiskEvents>;
  generatedAt: string;
};

export function buildComplianceReport(events: CertificationAuditEvent[], scope: AuditReportFilter = {}, generatedAt = new Date().toISOString()): ComplianceReport {
  const scopedEvents = filterAuditEvents(events, scope);
  return {
    scope,
    totalEvents: scopedEvents.length,
    actors: Array.from(new Set(scopedEvents.map((event) => event.actorId))).sort(),
    changedEntities: Array.from(new Set(scopedEvents.map((event) => event.entityId))).sort(),
    riskEvents: findRiskEvents(scopedEvents, "MEDIUM"),
    generatedAt
  };
}

export function filterAuditEvents(events: CertificationAuditEvent[], filter: AuditReportFilter) {
  return events.filter((event) => {
    if (filter.domainId && filter.domainId !== event.domainId) return false;
    if (filter.packId && filter.packId !== event.packId) return false;
    if (filter.actorId && filter.actorId !== event.actorId) return false;
    if (filter.entityType && filter.entityType !== event.entityType) return false;
    if (filter.entityId && filter.entityId !== event.entityId) return false;
    if (filter.eventType && filter.eventType !== event.eventType) return false;
    return true;
  });
}
