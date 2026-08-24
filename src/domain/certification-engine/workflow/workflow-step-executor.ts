import type { CertificationDomainEvent } from "@/domain/certification-engine/events/certification-domain-event";
import type { WorkflowStep, WorkflowStepAction, WorkflowStepExecutionResult } from "./certification-workflow";

export type WorkflowExecutionContext = {
  instanceId: string;
  workflowId: string;
  event: CertificationDomainEvent;
};

export type WorkflowStepExecutor = {
  supports(action: WorkflowStepAction): boolean;
  executeStep(step: WorkflowStep, context: WorkflowExecutionContext): Promise<WorkflowStepExecutionResult>;
};

export class RecordingWorkflowStepExecutor implements WorkflowStepExecutor {
  constructor(
    private readonly name: string,
    private readonly actions: WorkflowStepAction[],
    private readonly failActions: WorkflowStepAction[] = []
  ) {}

  supports(action: WorkflowStepAction) {
    return this.actions.includes(action);
  }

  async executeStep(step: WorkflowStep): Promise<WorkflowStepExecutionResult> {
    const success = !this.failActions.includes(step.action);
    return {
      stepId: step.stepId,
      action: step.action,
      success,
      attempts: success ? 1 : Math.max(1, step.retryPolicy.maxAttempts),
      message: success ? `${this.name} recorded ${step.action}` : `${this.name} failed ${step.action}`
    };
  }
}

export function createDefaultWorkflowExecutors(failActions: WorkflowStepAction[] = []): WorkflowStepExecutor[] {
  return [
    new RecordingWorkflowStepExecutor("AuditStepExecutor", ["CREATE_AUDIT"], failActions),
    new RecordingWorkflowStepExecutor("ImpactAnalysisStepExecutor", ["RUN_IMPACT_ANALYSIS", "CREATE_REVIEW_TASK"], failActions),
    new RecordingWorkflowStepExecutor("ReportStepExecutor", ["GENERATE_REPORT", "NOTIFY_USER", "UPDATE_ANALYTICS"], failActions)
  ];
}
