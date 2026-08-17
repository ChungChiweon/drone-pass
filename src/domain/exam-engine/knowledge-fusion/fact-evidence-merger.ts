import type { FactCandidate } from "@/domain/exam-engine/knowledge-ingestion/knowledge-ingestion";
import type { KnowledgeSourceRecord } from "./knowledge-source-registry";
import { resolvePreferredEvidence } from "./source-priority-resolver";

export type MergedFactEvidence = {
  factPattern: string;
  candidateIds: string[];
  sourceIds: string[];
  sourceCount: number;
  sourceAgreement: number;
  preferredSource?: KnowledgeSourceRecord;
  confidenceIncrease: number;
};

export function mergeFactEvidence(candidates: FactCandidate[], sources: KnowledgeSourceRecord[]): MergedFactEvidence[] {
  return [...groupByPattern(candidates).entries()].map(([factPattern, group]) => {
    const sourceIds = [...new Set(group.map((candidate) => candidate.sourceId))];
    const supportingSources = sources.filter((source) => sourceIds.includes(source.sourceId));
    const preferred = resolvePreferredEvidence(supportingSources);
    const agreement = sourceAgreement(group);
    return {
      factPattern,
      candidateIds: group.map((candidate) => candidate.candidateId),
      sourceIds,
      sourceCount: sourceIds.length,
      sourceAgreement: agreement,
      preferredSource: preferred?.source,
      confidenceIncrease: round(Math.min(0.25, Math.max(0, sourceIds.length - 1) * 0.08 + agreement * 0.08))
    };
  }).sort((left, right) => right.sourceCount - left.sourceCount || right.sourceAgreement - left.sourceAgreement);
}

export function factPattern(candidate: FactCandidate) {
  const numbers = candidate.extractedNumbers.flatMap((value) => [...value.matchAll(/\d+(?:\.\d+)?/g)].map((match) => match[0])).join(",");
  const concept = candidate.conceptHint ?? "unknown-concept";
  const category = candidate.categoryHint ?? "unknown-category";
  const normalizedStatement = candidate.statement.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((token) => token.length > 1).slice(0, 10).join("-");
  return `${concept}:${category}:${numbers || normalizedStatement}`;
}

function groupByPattern(candidates: FactCandidate[]) {
  const map = new Map<string, FactCandidate[]>();
  for (const candidate of candidates) {
    const key = factPattern(candidate);
    map.set(key, [...(map.get(key) ?? []), candidate]);
  }
  return map;
}

function sourceAgreement(candidates: FactCandidate[]) {
  if (candidates.length <= 1) return 1;
  const numberSets = candidates.map((candidate) => new Set(candidate.extractedNumbers));
  const first = numberSets[0];
  const equalNumbers = numberSets.every((set) => set.size === first.size && [...set].every((value) => first.has(value)));
  const conditionCounts = candidates.map((candidate) => candidate.extractedConditions.length);
  const equalConditions = conditionCounts.every((count) => count === conditionCounts[0]);
  return round((equalNumbers ? 0.55 : 0.2) + (equalConditions ? 0.3 : 0.1) + 0.15);
}

function round(value: number) {
  return Math.round(Math.min(1, value) * 1000) / 1000;
}
