import type { KnowledgeRelation, RelationType } from "@/domain/exam-engine/types";

export type RelationPriorityScore = {
  relationType: RelationType;
  baseScore: number;
  reason: string;
};

const RELATION_PRIORITY: Record<RelationType, RelationPriorityScore> = {
  CONFUSED_WITH: {
    relationType: "CONFUSED_WITH",
    baseScore: 0.95,
    reason: "Confusable facts are high-value for stable distractors."
  },
  EXCEPTION_OF: {
    relationType: "EXCEPTION_OF",
    baseScore: 0.95,
    reason: "Exception rules are frequently tested and easy to misread."
  },
  CONTRASTS_WITH: {
    relationType: "CONTRASTS_WITH",
    baseScore: 0.9,
    reason: "Contrasting rules create strong comparison questions."
  },
  COMPARISON_PAIR: {
    relationType: "COMPARISON_PAIR",
    baseScore: 0.85,
    reason: "Comparable numeric or categorical values support objective choices."
  },
  PREREQUISITE_FOR: {
    relationType: "PREREQUISITE_FOR",
    baseScore: 0.8,
    reason: "Prerequisite relations help test sequence and eligibility."
  },
  DERIVED_FROM: {
    relationType: "DERIVED_FROM",
    baseScore: 0.7,
    reason: "Derived facts need source consistency checks."
  },
  RELATED: {
    relationType: "RELATED",
    baseScore: 0.5,
    reason: "Related facts provide context but may not be direct distractors."
  },
  SAME_CONCEPT: {
    relationType: "SAME_CONCEPT",
    baseScore: 0.4,
    reason: "Same-concept facts are broad topic neighbors."
  },
  APPLIES_TO: {
    relationType: "APPLIES_TO",
    baseScore: 0.6,
    reason: "Applicability relations clarify scope and target conditions."
  }
};

export function scoreRelation(relation: KnowledgeRelation): RelationPriorityScore {
  return RELATION_PRIORITY[relation.relationType];
}

export function relationPriorityValue(relation: KnowledgeRelation) {
  return scoreRelation(relation).baseScore * relation.confidence;
}

export function rankRelationsForFact(factId: string, relations: KnowledgeRelation[]) {
  return relations
    .filter((relation) => relation.fromFactId === factId || relation.toFactId === factId)
    .toSorted((left, right) => relationPriorityValue(right) - relationPriorityValue(left));
}
