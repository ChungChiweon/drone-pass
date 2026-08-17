import type { AtomicFact, ExamValueScore, KnowledgeRelation } from "@/domain/exam-engine/types";
import type { KnowledgeRelationQualityScore, RelationCurationResult, RelationQualitySummary } from "./relation-curation";
import { scoreRelationQuality } from "./relation-curation-scorer";

export function curateRelations(
  relations: KnowledgeRelation[],
  facts: AtomicFact[],
  examScores: ExamValueScore[] = []
): RelationCurationResult {
  const deduped = dedupeRelations(relations);
  const scores = deduped
    .map((relation) => scoreRelationQuality(relation, facts, examScores))
    .sort((left, right) => right.overallScore - left.overallScore || left.relationId.localeCompare(right.relationId));

  return {
    totalRelations: deduped.length,
    reviewCandidates: scores.filter((score) => score.status === "review_candidate" || score.status === "approved_candidate"),
    approvedCandidates: scores.filter((score) => score.status === "approved_candidate"),
    rejectedCandidates: scores.filter((score) => score.status === "rejected_candidate"),
    qualitySummary: summarize(scores),
    scores
  };
}

function dedupeRelations(relations: KnowledgeRelation[]) {
  const seen = new Set<string>();
  const deduped: KnowledgeRelation[] = [];
  for (const relation of relations) {
    const key = relationKey(relation);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(relation);
  }
  return deduped;
}

function relationKey(relation: KnowledgeRelation) {
  const endpoints = [relation.fromFactId, relation.toFactId].sort().join("::");
  return `${relation.relationType}:${endpoints}`;
}

function summarize(scores: KnowledgeRelationQualityScore[]): RelationQualitySummary {
  return {
    averageOverallScore: average(scores.map((score) => score.overallScore)),
    averageConfidenceScore: average(scores.map((score) => score.confidenceScore)),
    averageExamRelevanceScore: average(scores.map((score) => score.examRelevanceScore)),
    averageRiskScore: average(scores.map((score) => score.riskScore))
  };
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}
