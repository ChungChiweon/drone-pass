import type { FactChangeEvent, FactImpactRiskLevel } from "./knowledge-lifecycle";

export type ChangePropagationTargetType = "RELATION" | "QUESTION" | "CONCEPT" | "EXAM_SCORE" | "ADAPTIVE_RULE";
export type ChangePropagationTaskStatus = "pending" | "reviewed" | "completed" | "ignored";

export type ChangePropagationTask = {
  taskId: string;
  factId: string;
  targetType: ChangePropagationTargetType;
  targetId: string;
  priority: FactImpactRiskLevel;
  status: ChangePropagationTaskStatus;
};

export function createPropagationTask(
  event: FactChangeEvent,
  targetType: ChangePropagationTargetType,
  targetId: string,
  priority: FactImpactRiskLevel
): ChangePropagationTask {
  return {
    taskId: `${event.eventId}:${targetType}:${targetId}`,
    factId: event.factId,
    targetType,
    targetId,
    priority,
    status: "pending"
  };
}
