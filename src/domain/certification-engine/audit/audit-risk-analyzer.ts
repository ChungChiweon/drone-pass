import type { CertificationAuditEvent } from "./certification-audit";

export type AuditRiskLevel = "HIGH" | "MEDIUM" | "LOW";

export type AuditRiskEvent = {
  event: CertificationAuditEvent;
  riskLevel: AuditRiskLevel;
  reason: string;
};

export function analyzeAuditRisk(event: CertificationAuditEvent): AuditRiskEvent {
  if (event.eventType === "PERMISSION_CHANGE") {
    return { event, riskLevel: "HIGH", reason: "Permission changes affect platform access boundaries" };
  }
  if (event.entityType === "PACK" || event.action.includes("MANAGE_PACK")) {
    return { event, riskLevel: "HIGH", reason: "Pack changes can affect certification content globally" };
  }
  if (event.action.includes("BULK") || Number(readMetadataValue(event, "affectedCount") ?? 0) >= 10) {
    return { event, riskLevel: "HIGH", reason: "Bulk operation detected" };
  }
  if (event.eventType === "FACT_REVIEW" || event.eventType === "FACT_PROMOTION") {
    return { event, riskLevel: "MEDIUM", reason: "Fact lifecycle event" };
  }
  if (event.eventType === "GRAPH_REVIEW" || event.entityType === "GRAPH") {
    return { event, riskLevel: "MEDIUM", reason: "Graph relation event" };
  }
  return { event, riskLevel: "LOW", reason: "Read or low-impact operational event" };
}

export function findRiskEvents(events: CertificationAuditEvent[], minimum: AuditRiskLevel = "MEDIUM") {
  const order: Record<AuditRiskLevel, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };
  return events.map(analyzeAuditRisk).filter((risk) => order[risk.riskLevel] >= order[minimum]);
}

function readMetadataValue(event: CertificationAuditEvent, key: string) {
  return event.metadata && typeof event.metadata === "object" ? (event.metadata as Record<string, unknown>)[key] : undefined;
}
