export type CertificationDomainEventType =
  | "FACT_CREATED"
  | "FACT_UPDATED"
  | "FACT_DEPRECATED"
  | "GRAPH_APPROVED"
  | "QUESTION_GENERATED"
  | "EXAM_COMPLETED"
  | "LEARNING_PROGRESS_UPDATED"
  | "USER_CERTIFICATION_CHANGED";

export type CertificationAggregateType =
  | "FACT"
  | "GRAPH"
  | "QUESTION"
  | "EXAM"
  | "LEARNING_PROGRESS"
  | "USER_CERTIFICATION";

export type CertificationEventContext = {
  domainId: string;
  packId: string;
  actorId: string;
  source: string;
};

export type CertificationDomainEvent<TPayload = unknown> = {
  eventId: string;
  eventType: CertificationDomainEventType;
  aggregateType: CertificationAggregateType;
  aggregateId: string;
  domainId: string;
  packId: string;
  payload: TPayload;
  timestamp: string;
};

export function createCertificationDomainEvent<TPayload>(
  context: CertificationEventContext,
  input: Omit<CertificationDomainEvent<TPayload>, "domainId" | "packId" | "timestamp">
): CertificationDomainEvent<TPayload> {
  return {
    ...input,
    domainId: context.domainId,
    packId: context.packId,
    timestamp: new Date().toISOString()
  };
}
