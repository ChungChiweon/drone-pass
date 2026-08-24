import type { AtomicFact, KnowledgeRelation, RelationType } from "@/domain/exam-engine/types";

export type GraphDistractorCandidate = {
  fact: AtomicFact;
  relation: KnowledgeRelation;
  priority: number;
  reason: string;
};

const DISTRACTOR_PRIORITY: Partial<Record<RelationType, number>> = {
  CONFUSED_WITH: 4,
  COMPARISON_PAIR: 3,
  CONTRASTS_WITH: 2,
  RELATED: 1
};

export function buildGraphDistractorCandidates(
  targetFact: AtomicFact,
  graphRelations: KnowledgeRelation[],
  facts: AtomicFact[]
): GraphDistractorCandidate[] {
  const factsById = new Map(facts.map((fact) => [fact.id, fact]));
  const seenFactIds = new Set<string>();

  return graphRelations
    .filter((relation) => relation.reviewStatus === "approved")
    .filter((relation) => relation.fromFactId === targetFact.id || relation.toFactId === targetFact.id)
    .flatMap((relation) => {
      const priority = DISTRACTOR_PRIORITY[relation.relationType] ?? 0;
      if (!priority) return [];
      const candidateId = relation.fromFactId === targetFact.id ? relation.toFactId : relation.fromFactId;
      if (candidateId === targetFact.id || seenFactIds.has(candidateId)) return [];
      const fact = factsById.get(candidateId);
      if (!fact) return [];
      seenFactIds.add(candidateId);
      return [{
        fact,
        relation,
        priority,
        reason: `${relation.relationType}: ${relation.reason}`
      }];
    })
    .sort((left, right) => right.priority - left.priority || right.relation.confidence - left.relation.confidence || left.fact.id.localeCompare(right.fact.id));
}
