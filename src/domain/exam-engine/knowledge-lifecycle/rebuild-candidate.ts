import type { ChangePropagationTargetType } from "./change-propagation-queue";
import type { FactImpactRiskLevel } from "./knowledge-lifecycle";

export type RebuildCandidate = {
  targetType: ChangePropagationTargetType;
  targetId: string;
  reason: string;
  priority: FactImpactRiskLevel;
  dependencies: string[];
};

export function createRebuildCandidate(
  targetType: ChangePropagationTargetType,
  targetId: string,
  reason: string,
  priority: FactImpactRiskLevel,
  dependencies: string[] = []
): RebuildCandidate {
  return {
    targetType,
    targetId,
    reason,
    priority,
    dependencies
  };
}
