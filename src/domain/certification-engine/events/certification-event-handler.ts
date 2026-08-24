import type { CertificationDomainEvent, CertificationDomainEventType } from "./certification-domain-event";

export type CertificationEventHandler<TPayload = unknown> = {
  eventType: CertificationDomainEventType;
  handle(event: CertificationDomainEvent<TPayload>): void | Promise<void>;
};

export type CertificationEventHandlerFunction<TPayload = unknown> = (event: CertificationDomainEvent<TPayload>) => void | Promise<void>;
