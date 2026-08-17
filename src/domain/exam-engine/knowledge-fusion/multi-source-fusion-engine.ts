import type { FactCandidate } from "@/domain/exam-engine/knowledge-ingestion/knowledge-ingestion";
import type { MergedFactEvidence } from "./fact-evidence-merger";
import { mergeFactEvidence } from "./fact-evidence-merger";
import type { KnowledgeSourceRecord } from "./knowledge-source-registry";
import type { SourceRelationship } from "./source-relationship";
import { relationshipWeight } from "./source-relationship";
import type { SourceConflict } from "./source-conflict-detector";
import { detectSourceConflicts } from "./source-conflict-detector";
import { calculateFusionConfidence } from "./fusion-confidence";

export type SourceCandidateSet = {
  source: KnowledgeSourceRecord;
  candidates: FactCandidate[];
};

export type FusionResult = {
  mergedFacts: Array<MergedFactEvidence & { confidence: number }>;
  conflicts: SourceConflict[];
  supportingSources: KnowledgeSourceRecord[];
  confidence: number;
};

export function fuseKnowledgeSources(
  sourceCandidates: SourceCandidateSet[],
  relationships: SourceRelationship[] = []
): FusionResult {
  const supportingSources = sourceCandidates.map((item) => item.source);
  const candidates = sourceCandidates.flatMap((item) => item.candidates);
  const conflicts = detectSourceConflicts(candidates);
  const mergedFacts = mergeFactEvidence(candidates, supportingSources).map((evidence) => ({
    ...evidence,
    confidence: round(Math.min(1, calculateFusionConfidence(evidence, conflicts) + relationshipBoost(evidence.sourceIds, relationships)))
  }));
  return {
    mergedFacts,
    conflicts,
    supportingSources,
    confidence: round(average(mergedFacts.map((fact) => fact.confidence)))
  };
}

function relationshipBoost(sourceIds: string[], relationships: SourceRelationship[]) {
  return relationships
    .filter((relationship) => sourceIds.includes(relationship.parentSourceId) && sourceIds.includes(relationship.childSourceId))
    .reduce((sum, relationship) => sum + relationshipWeight(relationship.relationshipType), 0) * 0.1;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number) {
  return Math.round(Math.min(1, value) * 1000) / 1000;
}
