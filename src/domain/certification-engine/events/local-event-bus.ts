import type { CertificationEventBus } from "./certification-event-bus";
import type { CertificationDomainEvent, CertificationDomainEventType } from "./certification-domain-event";
import type { CertificationEventHandlerFunction } from "./certification-event-handler";
import { CertificationEventDispatcher } from "./event-dispatcher";

export class LocalCertificationEventBus implements CertificationEventBus {
  constructor(private readonly dispatcher = new CertificationEventDispatcher()) {}

  publish(event: CertificationDomainEvent) {
    return this.dispatcher.dispatch(event);
  }

  subscribe(eventType: CertificationDomainEventType, handler: CertificationEventHandlerFunction) {
    this.dispatcher.register(eventType, handler);
  }

  unsubscribe(eventType: CertificationDomainEventType, handler: CertificationEventHandlerFunction) {
    this.dispatcher.unregister(eventType, handler);
  }

  countHandlers(eventType: CertificationDomainEventType) {
    return this.dispatcher.countHandlers(eventType);
  }
}
