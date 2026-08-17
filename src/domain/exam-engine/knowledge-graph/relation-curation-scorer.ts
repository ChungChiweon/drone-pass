import type { AtomicFact, ExamValueScore, KnowledgeRelation } from "@/domain/exam-engine/types";
import type { KnowledgeRelationCurationStatus, KnowledgeRelationQualityScore } from "./relation-curation";

const WEIGHTS = {
  confidenceScore: 0.25,
  semanticValueScore: 0.25,
  examRelevanceScore: 0.3,
  redundancyScore: 0.1,
  riskScore: 0.1
} as const;

export function scoreRelationQuality(
  relation: KnowledgeRelation,
  facts: AtomicFact[],
  examScores: ExamValueScore[] = []
): KnowledgeRelationQualityScore {
  const factById = new Map(facts.map((fact) => [fact.id, fact]));
  const examScoreByFactId = new Map(examScores.map((score) => [score.factId, score]));
  const from = factById.get(relation.fromFactId);
  const to = factById.get(relation.toFactId);
  const confidenceScore = clamp(relation.confidence);
  const semanticValueScore = scoreSemanticValue(relation, from, to);
  const examRelevanceScore = scoreExamRelevance(relation, from, to, examScoreByFactId);
  const redundancyScore = scoreRedundancy(relation, facts);
  const riskScore = scoreRisk(relation, from, to);
  const overallScore = round(clamp(
    (confidenceScore * WEIGHTS.confidenceScore)
    + (semanticValueScore * WEIGHTS.semanticValueScore)
    + (examRelevanceScore * WEIGHTS.examRelevanceScore)
    + ((1 - redundancyScore) * WEIGHTS.redundancyScore)
    + ((1 - riskScore) * WEIGHTS.riskScore)
  ));

  return {
    relationId: relation.id,
    confidenceScore,
    semanticValueScore,
    examRelevanceScore,
    redundancyScore,
    riskScore,
    overallScore,
    status: classify(overallScore)
  };
}

function scoreSemanticValue(relation: KnowledgeRelation, from?: AtomicFact, to?: AtomicFact) {
  let score = 0.25;
  if (!from || !to) return 0.1;
  if (from.conceptId !== to.conceptId) score += 0.25;
  if (relation.relationType !== "SAME_CONCEPT") score += 0.25;
  if (relation.sourceReference || from.sourceReferences.length || to.sourceReferences.length) score += 0.15;
  if (relation.relationType === "SAME_CONCEPT") score -= 0.2;
  return clamp(score);
}

function scoreExamRelevance(
  relation: KnowledgeRelation,
  from: AtomicFact | undefined,
  to: AtomicFact | undefined,
  examScoreByFactId: Map<string, ExamValueScore>
) {
  const fromScore = from ? examScoreByFactId.get(from.id)?.overallScore ?? 0.45 : 0;
  const toScore = to ? examScoreByFactId.get(to.id)?.overallScore ?? 0.45 : 0;
  let score = (fromScore + toScore) / 2;
  if (relation.relationType === "CONFUSED_WITH") score += 0.25;
  if (relation.relationType === "EXCEPTION_OF") score += 0.25;
  if (relation.relationType === "COMPARISON_PAIR") score += 0.2;
  if (relation.relationType === "SAME_CONCEPT") score -= 0.15;
  return clamp(score);
}

function scoreRedundancy(relation: KnowledgeRelation, facts: AtomicFact[]) {
  const from = facts.find((fact) => fact.id === relation.fromFactId);
  const to = facts.find((fact) => fact.id === relation.toFactId);
  if (!from || !to) return 1;
  let score = 0;
  if (relation.relationType === "SAME_CONCEPT") score += 0.45;
  if (from.conceptId === to.conceptId && relation.relationType === "SAME_CONCEPT") score += 0.25;
  if (from.predicate === to.predicate && from.value === to.value) score += 0.2;
  return clamp(score);
}

function scoreRisk(relation: KnowledgeRelation, from?: AtomicFact, to?: AtomicFact) {
  let score = 0.15;
  if (!from || !to) score += 0.5;
  if (!relation.sourceReference && !(from?.sourceReferences.length) && !(to?.sourceReferences.length)) score += 0.2;
  if (relation.relationType === "SAME_CONCEPT") score += 0.25;
  if (relation.confidence < 0.65) score += 0.2;
  return clamp(score);
}

function classify(overallScore: number): KnowledgeRelationCurationStatus {
  if (overallScore >= 0.92) return "approved_candidate";
  if (overallScore >= 0.75) return "review_candidate";
  if (overallScore < 0.3) return "rejected_candidate";
  return "draft";
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
