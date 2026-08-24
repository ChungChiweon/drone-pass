import type { CertificationDomainEvent } from "@/domain/certification-engine/events/certification-domain-event";
import type { CertificationWorkflowDefinition, WorkflowInstance, WorkflowRunResult, WorkflowStep, WorkflowStepExecutionResult } from "./certification-workflow";
import type { WorkflowStepExecutor } from "./workflow-step-executor";

export async function startWorkflow(
  definition: CertificationWorkflowDefinition,
  event: CertificationDomainEvent,
  executors: WorkflowStepExecutor[] = []
): Promise<WorkflowRunResult> {
  if (definition.triggerEvent !== event.eventType) {
    return {
      instance: createInstance(definition, event, "cancelled", null, new Date().toISOString()),
      stepResults: []
    };
  }
  if (definition.status !== "active") {
    return {
      instance: createInstance(definition, event, "cancelled", null, new Date().toISOString()),
      stepResults: []
    };
  }

  const instance = createInstance(definition, event, "running", firstStep(definition)?.stepId ?? null, null);
  const stepResults: WorkflowStepExecutionResult[] = [];

  for (const step of orderedSteps(definition)) {
    instance.currentStep = step.stepId;
    const executor = executors.find((candidate) => candidate.supports(step.action));
    if (!executor) {
      stepResults.push(createFailedStepResult(step, "No executor registered"));
      instance.status = "failed";
      instance.completedAt = new Date().toISOString();
      return { instance, stepResults };
    }

    const result = await executor.executeStep(step, { instanceId: instance.instanceId, workflowId: definition.workflowId, event });
    stepResults.push(result);
    if (!result.success) {
      instance.status = "failed";
      instance.completedAt = new Date().toISOString();
      return { instance, stepResults };
    }
  }

  instance.status = "completed";
  instance.currentStep = null;
  instance.completedAt = new Date().toISOString();
  return { instance, stepResults };
}

function createInstance(
  definition: CertificationWorkflowDefinition,
  event: CertificationDomainEvent,
  status: WorkflowInstance["status"],
  currentStep: string | null,
  completedAt: string | null
): WorkflowInstance {
  return {
    instanceId: `${definition.workflowId}:${event.eventId}`,
    workflowId: definition.workflowId,
    aggregateId: event.aggregateId,
    status,
    currentStep,
    startedAt: new Date().toISOString(),
    completedAt
  };
}

function orderedSteps(definition: CertificationWorkflowDefinition) {
  return [...definition.steps].sort((left, right) => left.order - right.order || left.stepId.localeCompare(right.stepId));
}

function firstStep(definition: CertificationWorkflowDefinition) {
  return orderedSteps(definition)[0] ?? null;
}

function createFailedStepResult(step: WorkflowStep, message: string): WorkflowStepExecutionResult {
  return {
    stepId: step.stepId,
    action: step.action,
    success: false,
    attempts: 0,
    message
  };
}
