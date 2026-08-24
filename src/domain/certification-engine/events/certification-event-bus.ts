import type { CertificationDomainEvent, CertificationDomainEventType } from "./certification-domain-event";
import type { CertificationEventHandlerFunction } from "./certification-event-handler";

export type CertificationEventBus = {
  publish(event: CertificationDomainEvent): Promise<void>;
  subscribe(eventType: CertificationDomainEventType, handler: CertificationEventHandlerFunction): void;
  unsubscribe(eventType: CertificationDomainEventType, handler: CertificationEventHandlerFunction): void;
};
