import type { CertificationDomainEventType } from "@/domain/certification-engine/events/certification-domain-event";

export type WorkflowStatus = "draft" | "active" | "archived";

export type WorkflowStepAction =
  | "RUN_IMPACT_ANALYSIS"
  | "CREATE_REVIEW_TASK"
  | "UPDATE_ANALYTICS"
  | "CREATE_AUDIT"
  | "NOTIFY_USER"
  | "GENERATE_REPORT";

export type RetryStrategy = "NONE" | "FIXED" | "EXPONENTIAL";

export type RetryPolicy = {
  maxAttempts: number;
  delayMs: number;
  strategy: RetryStrategy;
};

export type WorkflowStep = {
  stepId: string;
  name: string;
  action: WorkflowStepAction;
  order: number;
  retryPolicy: RetryPolicy;
};

export type CertificationWorkflowDefinition = {
  workflowId: string;
  name: string;
  triggerEvent: CertificationDomainEventType;
  steps: WorkflowStep[];
  version: string;
  status: WorkflowStatus;
};

export type WorkflowInstanceStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export type WorkflowInstance = {
  instanceId: string;
  workflowId: string;
  aggregateId: string;
  status: WorkflowInstanceStatus;
  currentStep: string | null;
  startedAt: string;
  completedAt: string | null;
};

export type WorkflowStepExecutionResult = {
  stepId: string;
  action: WorkflowStepAction;
  success: boolean;
  attempts: number;
  message: string;
};

export type WorkflowRunResult = {
  instance: WorkflowInstance;
  stepResults: WorkflowStepExecutionResult[];
};
