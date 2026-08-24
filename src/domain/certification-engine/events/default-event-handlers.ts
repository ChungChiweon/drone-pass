import type { CertificationDomainEvent, CertificationDomainEventType } from "./certification-domain-event";
import type { CertificationEventHandler } from "./certification-event-handler";

export type HandlerExecutionRecord = {
  handlerName: string;
  eventId: string;
  eventType: CertificationDomainEventType;
  handledAt: string;
};

export function createAuditEventHandler(records: HandlerExecutionRecord[] = []): CertificationEventHandler {
  return createRecordingHandler("AuditEventHandler", "FACT_UPDATED", records);
}

export function createGraphUpdateHandler(records: HandlerExecutionRecord[] = []): CertificationEventHandler {
  return createRecordingHandler("GraphUpdateHandler", "GRAPH_APPROVED", records);
}

export function createAnalyticsUpdateHandler(records: HandlerExecutionRecord[] = []): CertificationEventHandler {
  return createRecordingHandler("AnalyticsUpdateHandler", "LEARNING_PROGRESS_UPDATED", records);
}

export function createExamImpactHandler(records: HandlerExecutionRecord[] = []): CertificationEventHandler {
  return createRecordingHandler("ExamImpactHandler", "FACT_UPDATED", records);
}

function createRecordingHandler(
  handlerName: string,
  eventType: CertificationDomainEventType,
  records: HandlerExecutionRecord[]
): CertificationEventHandler {
  return {
    eventType,
    handle(event: CertificationDomainEvent) {
      records.push({
        handlerName,
        eventId: event.eventId,
        eventType: event.eventType,
        handledAt: new Date().toISOString()
      });
    }
  };
}
