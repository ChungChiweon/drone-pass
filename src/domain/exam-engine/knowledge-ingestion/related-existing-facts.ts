import type { AtomicFact, KnowledgeRelation } from "@/domain/exam-engine/types";
import type { FactCandidate, RelatedExistingFact } from "./knowledge-ingestion";

export function findRelatedExistingFacts(
  candidate: FactCandidate,
  existingFacts: AtomicFact[],
  relations: KnowledgeRelation[] = []
): RelatedExistingFact[] {
  const relationFactIds = new Set(relations
    .filter((relation) => relation.reviewStatus === "approved")
    .flatMap((relation) => [relation.fromFactId, relation.toFactId]));
  const candidateNumbers = new Set(candidate.extractedNumbers);

  return existingFacts
    .flatMap((fact) => {
      const hints: RelatedExistingFact[] = [];
      if (candidate.conceptHint && candidate.conceptHint === fact.conceptId) {
        hints.push({ factId: fact.id, relationHint: "same_concept", confidence: 0.75, reason: `conceptHint=${candidate.conceptHint}` });
      }
      if (fact.predicate && candidate.statement.includes(fact.predicate)) {
        hints.push({ factId: fact.id, relationHint: "same_predicate", confidence: 0.68, reason: `predicate=${fact.predicate}` });
      }
      if (candidateNumbers.has(String(fact.value))) {
        hints.push({ factId: fact.id, relationHint: "shared_number", confidence: 0.62, reason: `value=${fact.value}` });
      }
      if (relationFactIds.has(fact.id)) {
        hints.push({ factId: fact.id, relationHint: "graph_relation", confidence: 0.55, reason: "fact already participates in approved graph" });
      }
      return hints;
    })
    .sort((left, right) => right.confidence - left.confidence || left.factId.localeCompare(right.factId));
}
