import { describe, expect, it } from "vitest";
import type { CertificationDomainEvent } from "@/domain/certification-engine/events/certification-domain-event";
import type { CertificationWorkflowDefinition, RetryPolicy, WorkflowStep } from "./certification-workflow";
import { startWorkflow } from "./workflow-engine";
import { CertificationWorkflowRegistry } from "./workflow-registry";
import { createDefaultWorkflowExecutors } from "./workflow-step-executor";

const retryPolicy: RetryPolicy = {
  maxAttempts: 3,
  delayMs: 100,
  strategy: "FIXED"
};

function event(type: CertificationDomainEvent["eventType"] = "FACT_UPDATED"): CertificationDomainEvent {
  return {
    eventId: "evt-1",
    eventType: type,
    aggregateType: "FACT",
    aggregateId: "AF-001",
    domainId: "kr-drone-license",
    packId: "kr-drone-license:mrm0omvd",
    payload: { factId: "AF-001" },
    timestamp: "2026-07-29T00:00:00.000Z"
  };
}

function step(stepId: string, order: number, action: WorkflowStep["action"]): WorkflowStep {
  return {
    stepId,
    name: stepId,
    action,
    order,
    retryPolicy
  };
}

function workflow(overrides: Partial<CertificationWorkflowDefinition> = {}): CertificationWorkflowDefinition {
  return {
    workflowId: "fact-update-workflow",
    name: "Fact Update Workflow",
    triggerEvent: "FACT_UPDATED",
    steps: [
      step("impact", 2, "RUN_IMPACT_ANALYSIS"),
      step("audit", 1, "CREATE_AUDIT"),
      step("report", 3, "GENERATE_REPORT")
    ],
    version: "1",
    status: "active",
    ...overrides
  };
}

describe("certification workflow orchestration layer", () => {
  it("registers and lists workflow definitions", () => {
    const registry = new CertificationWorkflowRegistry();
    registry.registerWorkflow(workflow());

    expect(registry.getWorkflow("fact-update-workflow")).toMatchObject({ name: "Fact Update Workflow" });
    expect(registry.listActiveWorkflowsByTrigger("FACT_UPDATED")).toHaveLength(1);
    expect(registry.listActiveWorkflowsByTrigger("GRAPH_APPROVED")).toHaveLength(0);
  });

  it("starts workflow instances from matching events", async () => {
    const result = await startWorkflow(workflow(), event(), createDefaultWorkflowExecutors());

    expect(result.instance).toMatchObject({
      instanceId: "fact-update-workflow:evt-1",
      workflowId: "fact-update-workflow",
      aggregateId: "AF-001",
      status: "completed",
      currentStep: null
    });
  });

  it("executes steps in order", async () => {
    const result = await startWorkflow(workflow(), event(), createDefaultWorkflowExecutors());

    expect(result.stepResults.map((item) => item.stepId)).toEqual(["audit", "impact", "report"]);
  });

  it("preserves retry policy in workflow definitions and failed step attempts", async () => {
    const definition = workflow();
    expect(definition.steps[0].retryPolicy).toEqual(retryPolicy);

    const result = await startWorkflow(definition, event(), createDefaultWorkflowExecutors(["RUN_IMPACT_ANALYSIS"]));

    expect(result.instance.status).toBe("failed");
    expect(result.stepResults.at(-1)).toMatchObject({
      stepId: "impact",
      success: false,
      attempts: 3
    });
  });

  it("cancels when event trigger or workflow status does not match", async () => {
    await expect(startWorkflow(workflow(), event("GRAPH_APPROVED"), createDefaultWorkflowExecutors())).resolves.toMatchObject({
      instance: { status: "cancelled" },
      stepResults: []
    });
    await expect(startWorkflow(workflow({ status: "draft" }), event(), createDefaultWorkflowExecutors())).resolves.toMatchObject({
      instance: { status: "cancelled" },
      stepResults: []
    });
  });
});
