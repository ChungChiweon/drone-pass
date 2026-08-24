import type { AtomicFact, KnowledgeRelation, SourceDocument } from "@/domain/exam-engine/types";
import { findRelatedExistingFacts } from "./related-existing-facts";
import { validateFactPromotion } from "./fact-promotion-validator";
import type { FactCandidate, FactGraphPromotionCandidate, FactPromotionPreview } from "./knowledge-ingestion";

export function createPromotionPreview(
  acceptedCandidates: FactCandidate[],
  existingFacts: AtomicFact[],
  relations: KnowledgeRelation[] = [],
  sourceDocuments: SourceDocument[] = []
): FactPromotionPreview[] {
  return acceptedCandidates
    .filter((candidate) => candidate.status === "accepted")
    .map((candidate, index) => {
      const proposedFactId = proposeFactId(existingFacts, index);
      const validationResult = validateFactPromotion(candidate, existingFacts, sourceDocuments);
      return {
        candidateId: candidate.candidateId,
        proposedFactId,
        statement: candidate.statement,
        conceptId: candidate.conceptHint,
        categoryId: candidate.categoryHint,
        sourceReference: candidate.sourceReference,
        confidence: candidate.confidence,
        validationResult,
        graphConnectionCandidates: buildGraphPromotionCandidate(proposedFactId, candidate, existingFacts, relations)
      };
    });
}

function buildGraphPromotionCandidate(
  newFactId: string,
  candidate: FactCandidate,
  existingFacts: AtomicFact[],
  relations: KnowledgeRelation[]
): FactGraphPromotionCandidate {
  const relatedFacts = findRelatedExistingFacts(candidate, existingFacts, relations);
  const relatedFactIds = [...new Set(relatedFacts.map((item) => item.factId))];
  return {
    newFactId,
    relatedFactIds,
    suggestedRelations: relatedFacts.map((related) => ({
      toFactId: related.factId,
      relationType: relationTypeForHint(related.relationHint),
      reason: related.reason,
      confidence: related.confidence
    }))
  };
}

function relationTypeForHint(hint: ReturnType<typeof findRelatedExistingFacts>[number]["relationHint"]) {
  if (hint === "same_concept") return "SAME_CONCEPT" as const;
  if (hint === "same_predicate") return "RELATED" as const;
  if (hint === "shared_number") return "COMPARISON_PAIR" as const;
  return "CONFUSED_WITH" as const;
}

function proposeFactId(existingFacts: AtomicFact[], index: number) {
  const maxNumber = existingFacts.reduce((max, fact) => {
    const match = fact.id.match(/^AF-(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `AF-${String(maxNumber + index + 1).padStart(3, "0")}`;
}
