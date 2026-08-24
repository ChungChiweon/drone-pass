import type { KnowledgeRelation } from "@/domain/exam-engine/types";
import type { KnowledgeRelationQualityScore } from "./relation-curation";

export type GraphReviewItem = {
  relation: KnowledgeRelation;
  qualityScore: KnowledgeRelationQualityScore;
  priority: number;
  reason: string;
};

const RELATION_TYPE_PRIORITY: Record<KnowledgeRelation["relationType"], number> = {
  CONFUSED_WITH: 0.3,
  EXCEPTION_OF: 0.28,
  COMPARISON_PAIR: 0.25,
  CONTRASTS_WITH: 0.2,
  PREREQUISITE_FOR: 0.18,
  DERIVED_FROM: 0.15,
  APPLIES_TO: 0.12,
  RELATED: 0.1,
  SAME_CONCEPT: 0.05
};

export function buildGraphReviewQueue(
  relations: KnowledgeRelation[],
  qualityScores: KnowledgeRelationQualityScore[]
): GraphReviewItem[] {
  const relationById = new Map(relations.map((relation) => [relation.id, relation]));
  return qualityScores
    .filter((score) => score.status === "approved_candidate" || score.status === "review_candidate")
    .flatMap((score) => {
      const relation = relationById.get(score.relationId);
      if (!relation) return [];
      if (relation.reviewStatus === "approved" || relation.reviewStatus === "rejected" || relation.reviewStatus === "held") return [];
      return [{
        relation,
        qualityScore: score,
        priority: priority(relation, score),
        reason: reason(relation, score)
      }];
    })
    .sort((left, right) => right.priority - left.priority || left.relation.id.localeCompare(right.relation.id));
}

function priority(relation: KnowledgeRelation, score: KnowledgeRelationQualityScore) {
  return round(
    (score.overallScore * 0.5)
    + (score.examRelevanceScore * 0.28)
    + (RELATION_TYPE_PRIORITY[relation.relationType] ?? 0)
  );
}

function reason(relation: KnowledgeRelation, score: KnowledgeRelationQualityScore) {
  return [
    `status=${score.status}`,
    `overall=${score.overallScore.toFixed(2)}`,
    `examRelevance=${score.examRelevanceScore.toFixed(2)}`,
    `type=${relation.relationType}`
  ].join("; ");
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
