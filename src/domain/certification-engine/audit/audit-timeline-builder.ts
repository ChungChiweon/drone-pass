import type { AuditTimeline, CertificationAuditEntityType, CertificationAuditEvent } from "./certification-audit";

export function buildAuditTimeline(events: CertificationAuditEvent[]): AuditTimeline {
  const chronological = [...events].sort((left, right) => left.timestamp.localeCompare(right.timestamp) || left.eventId.localeCompare(right.eventId));
  return {
    events: chronological,
    actorHistory: buildActorHistory(chronological),
    changeHistory: buildChangeHistory(chronological)
  };
}

function buildActorHistory(events: CertificationAuditEvent[]) {
  const byActor = new Map<string, { actorId: string; count: number; firstSeenAt: string; lastSeenAt: string }>();
  for (const event of events) {
    const current = byActor.get(event.actorId);
    byActor.set(event.actorId, {
      actorId: event.actorId,
      count: (current?.count ?? 0) + 1,
      firstSeenAt: current?.firstSeenAt ?? event.timestamp,
      lastSeenAt: event.timestamp
    });
  }
  return [...byActor.values()].sort((left, right) => left.actorId.localeCompare(right.actorId));
}

function buildChangeHistory(events: CertificationAuditEvent[]) {
  const byEntity = new Map<string, { entityId: string; entityType: CertificationAuditEntityType; eventCount: number; lastChangedAt: string }>();
  for (const event of events) {
    const current = byEntity.get(event.entityId);
    byEntity.set(event.entityId, {
      entityId: event.entityId,
      entityType: event.entityType,
      eventCount: (current?.eventCount ?? 0) + 1,
      lastChangedAt: event.timestamp
    });
  }
  return [...byEntity.values()].sort((left, right) => left.entityId.localeCompare(right.entityId));
}
