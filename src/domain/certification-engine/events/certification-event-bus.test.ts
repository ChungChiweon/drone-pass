import { describe, expect, it } from "vitest";
import { createAuditEventHandler, createExamImpactHandler, createGraphUpdateHandler, type HandlerExecutionRecord } from "./default-event-handlers";
import { LocalCertificationEventBus } from "./local-event-bus";
import type { CertificationDomainEvent } from "./certification-domain-event";
import { createCertificationDomainEvent } from "./certification-domain-event";

const context = {
  domainId: "kr-drone-license",
  packId: "kr-drone-license:mrm0omvd",
  actorId: "user-1",
  source: "unit-test"
};

function factUpdatedEvent(id = "evt-1"): CertificationDomainEvent<{ factId: string }> {
  return {
    eventId: id,
    eventType: "FACT_UPDATED",
    aggregateType: "FACT",
    aggregateId: "AF-001",
    domainId: context.domainId,
    packId: context.packId,
    payload: { factId: "AF-001" },
    timestamp: "2026-07-29T00:00:00.000Z"
  };
}

describe("certification event driven architecture", () => {
  it("publishes events to subscribed handlers", async () => {
    const bus = new LocalCertificationEventBus();
    const received: CertificationDomainEvent[] = [];
    bus.subscribe("FACT_UPDATED", (event) => {
      received.push(event);
    });

    await bus.publish(factUpdatedEvent());

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ eventType: "FACT_UPDATED", aggregateId: "AF-001" });
  });

  it("filters handlers by event type", async () => {
    const bus = new LocalCertificationEventBus();
    const received: CertificationDomainEvent[] = [];
    bus.subscribe("GRAPH_APPROVED", (event) => {
      received.push(event);
    });

    await bus.publish(factUpdatedEvent());

    expect(received).toHaveLength(0);
  });

  it("runs multiple handlers and supports unsubscribe", async () => {
    const bus = new LocalCertificationEventBus();
    const received: string[] = [];
    const first = () => {
      received.push("first");
    };
    const second = () => {
      received.push("second");
    };
    bus.subscribe("FACT_UPDATED", first);
    bus.subscribe("FACT_UPDATED", second);

    await bus.publish(factUpdatedEvent());
    bus.unsubscribe("FACT_UPDATED", first);
    await bus.publish(factUpdatedEvent("evt-2"));

    expect(received).toEqual(["first", "second", "second"]);
    expect(bus.countHandlers("FACT_UPDATED")).toBe(1);
  });

  it("provides mock handler structures for audit, graph, analytics, and exam modules", async () => {
    const bus = new LocalCertificationEventBus();
    const records: HandlerExecutionRecord[] = [];
    const audit = createAuditEventHandler(records);
    const exam = createExamImpactHandler(records);
    const graph = createGraphUpdateHandler(records);
    bus.subscribe(audit.eventType, audit.handle);
    bus.subscribe(exam.eventType, exam.handle);
    bus.subscribe(graph.eventType, graph.handle);

    await bus.publish(factUpdatedEvent());
    await bus.publish({
      ...factUpdatedEvent("evt-graph"),
      eventType: "GRAPH_APPROVED",
      aggregateType: "GRAPH",
      aggregateId: "kg-v1"
    });

    expect(records.map((record) => record.handlerName)).toEqual(["AuditEventHandler", "ExamImpactHandler", "GraphUpdateHandler"]);
  });

  it("creates domain events from event context without mutating engine data", () => {
    const event = createCertificationDomainEvent(context, {
      eventId: "evt-created",
      eventType: "QUESTION_GENERATED",
      aggregateType: "QUESTION",
      aggregateId: "Q-001",
      payload: { questionId: "Q-001" }
    });

    expect(event).toMatchObject({
      domainId: "kr-drone-license",
      packId: "kr-drone-license:mrm0omvd",
      eventType: "QUESTION_GENERATED"
    });
  });
});
