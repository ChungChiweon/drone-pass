import { describe, expect, it } from "vitest";
import { buildComplianceReport, filterAuditEvents } from "./audit-compliance-report";
import { analyzeAuditRisk, findRiskEvents } from "./audit-risk-analyzer";
import { buildAuditTimeline } from "./audit-timeline-builder";
import type { AuditContext, CertificationAuditEvent } from "./certification-audit";
import type { CertificationAuditRepository } from "./certification-audit-repository";

const context: AuditContext = {
  domainId: "kr-drone-license",
  packId: "kr-drone-license:mrm0omvd",
  actorId: "admin-1",
  sessionId: "session-1"
};

function event(overrides: Partial<CertificationAuditEvent> = {}): CertificationAuditEvent {
  return {
    eventId: "evt-1",
    eventType: "FACT_REVIEW",
    actorId: context.actorId,
    actorRole: "REVIEWER",
    domainId: context.domainId,
    packId: context.packId,
    entityType: "FACT",
    entityId: "AF-001",
    action: "APPROVE_FACT",
    beforeState: { status: "draft" },
    afterState: { status: "approved" },
    metadata: { sessionId: context.sessionId },
    timestamp: "2026-07-29T00:00:00.000Z",
    ...overrides
  };
}

function memoryRepository(events: CertificationAuditEvent[] = []): CertificationAuditRepository {
  return {
    async appendEvent(value) {
      events.push(value);
      return value;
    },
    async getEvents(entityId) {
      return events.filter((value) => value.entityId === entityId);
    },
    async getTimeline(scope) {
      return filterAuditEvents(events, scope);
    },
    async getAuditReport(filter) {
      return buildComplianceReport(events, filter, "2026-07-29T01:00:00.000Z");
    }
  };
}

describe("unified certification audit and compliance layer", () => {
  it("creates audit events and supports entity lookup through the repository interface", async () => {
    const repository = memoryRepository();
    await repository.appendEvent(event());

    await expect(repository.getEvents("AF-001")).resolves.toHaveLength(1);
    await expect(repository.getEvents("AF-001")).resolves.toMatchObject([{ metadata: { sessionId: "session-1" } }]);
  });

  it("builds chronological timeline, actor history, and change history", () => {
    const timeline = buildAuditTimeline([
      event({ eventId: "evt-2", entityId: "REL-001", entityType: "GRAPH", timestamp: "2026-07-29T00:02:00.000Z" }),
      event({ eventId: "evt-1", entityId: "AF-001", timestamp: "2026-07-29T00:01:00.000Z" })
    ]);

    expect(timeline.events.map((item) => item.eventId)).toEqual(["evt-1", "evt-2"]);
    expect(timeline.actorHistory).toMatchObject([{ actorId: "admin-1", count: 2 }]);
    expect(timeline.changeHistory.map((item) => item.entityId)).toEqual(["AF-001", "REL-001"]);
  });

  it("filters timeline scope and compliance reports by domain, pack, actor, and entity", async () => {
    const repository = memoryRepository([
      event({ eventId: "evt-1", entityId: "AF-001" }),
      event({ eventId: "evt-2", actorId: "reviewer-2", entityId: "AF-002" }),
      event({ eventId: "evt-3", domainId: "boat-license", packId: "boat-pack", entityId: "B-AF-001" })
    ]);

    await expect(repository.getTimeline({ domainId: "kr-drone-license", packId: context.packId })).resolves.toHaveLength(2);
    await expect(repository.getAuditReport({ actorId: "admin-1", domainId: "kr-drone-license" })).resolves.toMatchObject({
      totalEvents: 1,
      actors: ["admin-1"],
      changedEntities: ["AF-001"]
    });
  });

  it("classifies audit risk levels", () => {
    expect(analyzeAuditRisk(event({ eventType: "PERMISSION_CHANGE", entityType: "PERMISSION" })).riskLevel).toBe("HIGH");
    expect(analyzeAuditRisk(event({ entityType: "PACK", action: "MANAGE_PACK" })).riskLevel).toBe("HIGH");
    expect(analyzeAuditRisk(event({ eventType: "GRAPH_REVIEW", entityType: "GRAPH" })).riskLevel).toBe("MEDIUM");
    expect(analyzeAuditRisk(event({ eventType: "ADMIN_COMMAND", entityType: "REPORT", action: "VIEW_ANALYTICS" })).riskLevel).toBe("LOW");
  });

  it("creates compliance reports with risk event summaries", () => {
    const report = buildComplianceReport([
      event({ eventId: "evt-1" }),
      event({ eventId: "evt-2", eventType: "PERMISSION_CHANGE", entityType: "PERMISSION", entityId: "user-1" }),
      event({ eventId: "evt-3", entityType: "REPORT", action: "VIEW_ANALYTICS", entityId: "report-1" })
    ], { domainId: "kr-drone-license" }, "2026-07-29T01:00:00.000Z");

    expect(report.totalEvents).toBe(3);
    expect(report.riskEvents.map((risk) => risk.riskLevel)).toEqual(["MEDIUM", "HIGH", "MEDIUM"]);
    expect(findRiskEvents(report.riskEvents.map((risk) => risk.event), "HIGH")).toHaveLength(1);
  });
});
