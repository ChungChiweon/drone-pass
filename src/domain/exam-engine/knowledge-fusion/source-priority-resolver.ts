import type { KnowledgeSourceRecord, SourcePriority } from "./knowledge-source-registry";

export type PreferredEvidence = {
  source: KnowledgeSourceRecord;
  score: number;
  reason: string;
};

export function resolvePreferredEvidence(sources: KnowledgeSourceRecord[]): PreferredEvidence | null {
  const ranked = sources
    .map((source) => ({ source, score: sourcePriorityScore(source), reason: reason(source) }))
    .sort((left, right) => right.score - left.score || right.source.version.localeCompare(left.source.version));
  return ranked[0] ?? null;
}

export function sourcePriorityScore(source: KnowledgeSourceRecord) {
  return round(sourceTypeScore(source.sourceType) + priorityScore(source.priority) + freshnessScore(source.version, source.collectedAt));
}

function sourceTypeScore(sourceType: KnowledgeSourceRecord["sourceType"]) {
  if (sourceType === "LAW") return 0.38;
  if (sourceType === "DECREE") return 0.32;
  if (sourceType === "REGULATION") return 0.28;
  if (sourceType === "GUIDELINE") return 0.2;
  if (sourceType === "TEXTBOOK") return 0.12;
  return 0.08;
}

function priorityScore(priority: SourcePriority) {
  if (priority === "OFFICIAL_PRIMARY") return 0.4;
  if (priority === "OFFICIAL_SECONDARY") return 0.3;
  if (priority === "EDUCATIONAL") return 0.16;
  return 0.08;
}

function freshnessScore(version: string, collectedAt: string) {
  const versionSignal = /\d{4}/.test(version) ? 0.1 : 0.04;
  const collectedSignal = /^\d{4}-\d{2}-\d{2}/.test(collectedAt) ? 0.1 : 0.03;
  return versionSignal + collectedSignal;
}

function reason(source: KnowledgeSourceRecord) {
  return `${source.sourceType}/${source.priority}/version=${source.version}/collected=${source.collectedAt}`;
}

function round(value: number) {
  return Math.round(Math.min(1, value) * 1000) / 1000;
}
