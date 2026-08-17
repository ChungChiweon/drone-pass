import { createPropagationTask, type ChangePropagationTask, type ChangePropagationTargetType } from "./change-propagation-queue";
import { createRebuildCandidate, type RebuildCandidate } from "./rebuild-candidate";
import type { FactChangeEvent, FactImpactReport, FactImpactRiskLevel } from "./knowledge-lifecycle";

export type ChangePropagationResult = {
  event: FactChangeEvent;
  tasks: ChangePropagationTask[];
  rebuildCandidates: RebuildCandidate[];
};

export type ChangePriorityInput = {
  previousStatement?: string;
  nextStatement?: string;
  changeReason?: string;
};

export function createFactChangeEvent(input: {
  eventId: string;
  factId: string;
  previousVersion: string;
  nextVersion: string;
  changeType: FactChangeEvent["changeType"];
  createdAt?: string;
}): FactChangeEvent {
  return {
    eventId: input.eventId,
    factId: input.factId,
    previousVersion: input.previousVersion,
    nextVersion: input.nextVersion,
    changeType: input.changeType,
    createdAt: input.createdAt ?? new Date().toISOString()
  };
}

export function createPropagationTasks(
  factChangeEvent: FactChangeEvent,
  impactReport: FactImpactReport,
  priorityInput: ChangePriorityInput = {}
): ChangePropagationResult {
  const priority = calculateChangePriority(factChangeEvent, impactReport, priorityInput);
  const tasks: ChangePropagationTask[] = [
    ...impactReport.affectedRelations.map((id) => createPropagationTask(factChangeEvent, "RELATION", id, maxPriority(priority, "medium"))),
    ...impactReport.affectedQuestions.map((id) => createPropagationTask(factChangeEvent, "QUESTION", id, priority)),
    ...impactReport.affectedConcepts.map((id) => createPropagationTask(factChangeEvent, "CONCEPT", id, maxPriority(priority, "medium"))),
    createPropagationTask(factChangeEvent, "EXAM_SCORE", factChangeEvent.factId, priority),
    createPropagationTask(factChangeEvent, "ADAPTIVE_RULE", factChangeEvent.factId, priority)
  ];

  return {
    event: factChangeEvent,
    tasks,
    rebuildCandidates: tasks.map((task) => taskToRebuildCandidate(task, factChangeEvent))
  };
}

export function calculateChangePriority(
  event: FactChangeEvent,
  impactReport: FactImpactReport,
  input: ChangePriorityInput = {}
): FactImpactRiskLevel {
  const combined = [input.previousStatement, input.nextStatement, input.changeReason].filter(Boolean).join(" ");
  if (event.changeType === "DEPRECATE" || event.changeType === "REPLACE") return "high";
  if (/(벌칙|벌금|과태료|취소|정지|필수|하여야|금지|이상|이하|초과|미만|\d+)/.test(combined)) return "high";
  if (impactReport.riskLevel === "high") return "high";
  if (/(concept|개념|관계|relation|source|출처)/i.test(combined)) return "medium";
  if (impactReport.riskLevel === "medium") return "medium";
  return "low";
}

function taskToRebuildCandidate(task: ChangePropagationTask, event: FactChangeEvent): RebuildCandidate {
  return createRebuildCandidate(
    task.targetType,
    task.targetId,
    reasonForTarget(task.targetType),
    task.priority,
    [event.factId, event.nextVersion]
  );
}

function reasonForTarget(targetType: ChangePropagationTargetType) {
  if (targetType === "QUESTION") return "Question may need regeneration after fact change.";
  if (targetType === "RELATION") return "Knowledge graph relation should be reviewed after fact change.";
  if (targetType === "CONCEPT") return "Concept classification may be affected by fact change.";
  if (targetType === "EXAM_SCORE") return "ExamValueScore should be recalculated after fact change.";
  return "Adaptive learning rule should be reviewed after fact change.";
}

function maxPriority(left: FactImpactRiskLevel, minimum: FactImpactRiskLevel): FactImpactRiskLevel {
  const rank: Record<FactImpactRiskLevel, number> = { low: 1, medium: 2, high: 3 };
  return rank[left] >= rank[minimum] ? left : minimum;
}
