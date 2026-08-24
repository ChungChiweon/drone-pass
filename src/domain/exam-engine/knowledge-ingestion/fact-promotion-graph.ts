import type { AtomicFact, KnowledgeRelation } from "@/domain/exam-engine/types";

export type PromotionGraphCandidateResult = {
  newFactId: string;
  suggestedRelations: KnowledgeRelation[];
};

export function createPromotionGraphCandidates(
  newFact: AtomicFact,
  existingFacts: AtomicFact[]
): PromotionGraphCandidateResult {
  const suggestedRelations = existingFacts.flatMap((fact) => relationCandidates(newFact, fact));
  return {
    newFactId: newFact.id,
    suggestedRelations: dedupeRelations(suggestedRelations)
  };
}

function relationCandidates(newFact: AtomicFact, existingFact: AtomicFact): KnowledgeRelation[] {
  if (newFact.id === existingFact.id) return [];
  const createdAt = new Date(0).toISOString();
  const candidates: KnowledgeRelation[] = [];

  if (newFact.conceptId === existingFact.conceptId) {
    candidates.push(relation(newFact.id, existingFact.id, "SAME_CONCEPT", "same conceptId", 0.76, createdAt));
  }
  if (newFact.predicate === existingFact.predicate) {
    candidates.push(relation(newFact.id, existingFact.id, "RELATED", "same predicate", 0.66, createdAt));
  }
  if (String(newFact.value) === String(existingFact.value) || (newFact.unit && newFact.unit === existingFact.unit)) {
    candidates.push(relation(newFact.id, existingFact.id, "COMPARISON_PAIR", "shared value or unit", 0.62, createdAt));
  }
  if (newFact.statement !== existingFact.statement && sharedTokens(newFact.statement, existingFact.statement) >= 2) {
    candidates.push(relation(newFact.id, existingFact.id, "CONFUSED_WITH", "statement has overlapping legal terms", 0.58, createdAt));
  }

  return candidates;
}

function relation(
  fromFactId: string,
  toFactId: string,
  relationType: KnowledgeRelation["relationType"],
  reason: string,
  confidence: number,
  createdAt: string
): KnowledgeRelation {
  return {
    id: `PROMO-REL-${fromFactId}-${toFactId}-${relationType}`,
    packId: "promotion-preview",
    fromFactId,
    toFactId,
    relationType,
    reason,
    confidence,
    createdAt,
    reviewStatus: "draft"
  };
}

function sharedTokens(left: string, right: string) {
  const leftTokens = new Set(left.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((token) => token.length > 1));
  const rightTokens = new Set(right.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((token) => token.length > 1));
  return [...leftTokens].filter((token) => rightTokens.has(token)).length;
}

function dedupeRelations(relations: KnowledgeRelation[]) {
  const seen = new Set<string>();
  return relations.filter((relation) => {
    const key = `${relation.fromFactId}:${relation.toFactId}:${relation.relationType}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
