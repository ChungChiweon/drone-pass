import type { MergedFactEvidence } from "./fact-evidence-merger";
import type { SourceConflict } from "./source-conflict-detector";
import { sourcePriorityScore } from "./source-priority-resolver";

export function calculateFusionConfidence(evidence: MergedFactEvidence, conflicts: SourceConflict[] = []) {
  const authority = evidence.preferredSource ? sourcePriorityScore(evidence.preferredSource) : 0.3;
  const agreement = evidence.sourceAgreement;
  const sourceCount = Math.min(1, evidence.sourceCount / 3);
  const freshness = evidence.preferredSource?.collectedAt ? 0.8 : 0.4;
  const conflictPenalty = Math.min(0.5, conflictsForEvidence(evidence, conflicts).reduce((sum, conflict) => {
    if (conflict.severity === "HIGH") return sum + 0.22;
    if (conflict.severity === "MEDIUM") return sum + 0.1;
    return sum + 0.04;
  }, 0));
  return round(Math.max(0, (agreement * 0.34) + (authority * 0.26) + (sourceCount * 0.2) + (freshness * 0.1) + evidence.confidenceIncrease - conflictPenalty));
}

function conflictsForEvidence(evidence: MergedFactEvidence, conflicts: SourceConflict[]) {
  const candidateIds = new Set(evidence.candidateIds);
  return conflicts.filter((conflict) => conflict.candidateIds.some((candidateId) => candidateIds.has(candidateId)));
}

function round(value: number) {
  return Math.round(Math.min(1, value) * 1000) / 1000;
}
