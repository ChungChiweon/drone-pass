import type { CertificationDomainEvent, CertificationDomainEventType } from "./certification-domain-event";
import type { CertificationEventHandlerFunction } from "./certification-event-handler";

export class CertificationEventDispatcher {
  private readonly handlers = new Map<CertificationDomainEventType, Set<CertificationEventHandlerFunction>>();

  register(eventType: CertificationDomainEventType, handler: CertificationEventHandlerFunction) {
    const handlers = this.handlers.get(eventType) ?? new Set<CertificationEventHandlerFunction>();
    handlers.add(handler);
    this.handlers.set(eventType, handlers);
  }

  unregister(eventType: CertificationDomainEventType, handler: CertificationEventHandlerFunction) {
    const handlers = this.handlers.get(eventType);
    handlers?.delete(handler);
    if (handlers?.size === 0) this.handlers.delete(eventType);
  }

  async dispatch(event: CertificationDomainEvent) {
    const handlers = [...(this.handlers.get(event.eventType) ?? [])];
    for (const handler of handlers) {
      await handler(event);
    }
  }

  countHandlers(eventType: CertificationDomainEventType) {
    return this.handlers.get(eventType)?.size ?? 0;
  }
}
