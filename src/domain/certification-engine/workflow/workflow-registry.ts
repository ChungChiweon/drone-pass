import type { CertificationWorkflowDefinition } from "./certification-workflow";
import type { CertificationDomainEventType } from "@/domain/certification-engine/events/certification-domain-event";

export class CertificationWorkflowRegistry {
  private readonly workflows = new Map<string, CertificationWorkflowDefinition>();

  registerWorkflow(definition: CertificationWorkflowDefinition) {
    this.workflows.set(definition.workflowId, cloneWorkflow(definition));
    return definition;
  }

  getWorkflow(workflowId: string) {
    const workflow = this.workflows.get(workflowId);
    return workflow ? cloneWorkflow(workflow) : null;
  }

  listWorkflows() {
    return [...this.workflows.values()].map(cloneWorkflow).sort((left, right) => left.workflowId.localeCompare(right.workflowId));
  }

  listActiveWorkflowsByTrigger(triggerEvent: CertificationDomainEventType) {
    return this.listWorkflows().filter((workflow) => workflow.status === "active" && workflow.triggerEvent === triggerEvent);
  }
}

function cloneWorkflow(definition: CertificationWorkflowDefinition): CertificationWorkflowDefinition {
  return {
    ...definition,
    steps: definition.steps.map((step) => ({
      ...step,
      retryPolicy: { ...step.retryPolicy }
    }))
  };
}
