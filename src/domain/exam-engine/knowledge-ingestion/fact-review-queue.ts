import type { AtomicFact, KnowledgeRelation } from "@/domain/exam-engine/types";
import { detectDuplicateFact } from "./fact-duplicate-detector";
import { findRelatedExistingFacts } from "./related-existing-facts";
import type { FactCandidate, FactDuplicateResult, RelatedExistingFact } from "./knowledge-ingestion";

export type FactReviewItem = {
  candidate: FactCandidate;
  duplicateMatches: FactDuplicateResult;
  relatedFacts: RelatedExistingFact[];
  priority: number;
  reviewReason: string;
};

const SOURCE_PRIORITY: Record<string, number> = {
  LAW: 0.18,
  REGULATION: 0.16,
  EXAM: 0.14,
  TEXTBOOK: 0.1,
  OTHER: 0.04
};

export function buildFactReviewQueue(
  candidates: FactCandidate[],
  existingFacts: AtomicFact[] = [],
  relations: KnowledgeRelation[] = [],
  sourceTypesById: Record<string, string> = {}
): FactReviewItem[] {
  return candidates
    .filter((candidate) => !["accepted", "rejected"].includes(candidate.status))
    .map((candidate) => {
      const duplicateMatches = detectDuplicateFact(candidate, existingFacts);
      const relatedFacts = findRelatedExistingFacts(candidate, existingFacts, relations);
      const priority = scorePriority(candidate, duplicateMatches, relatedFacts, sourceTypesById[candidate.sourceId]);
      return {
        candidate,
        duplicateMatches,
        relatedFacts,
        priority,
        reviewReason: reason(candidate, duplicateMatches, relatedFacts)
      };
    })
    .sort((left, right) => {
      const duplicateSort = Number(right.candidate.status === "duplicate_candidate") - Number(left.candidate.status === "duplicate_candidate");
      return duplicateSort || right.priority - left.priority || left.candidate.candidateId.localeCompare(right.candidate.candidateId);
    });
}

function scorePriority(candidate: FactCandidate, duplicate: FactDuplicateResult, relatedFacts: RelatedExistingFact[], sourceType?: string) {
  const duplicateScore = candidate.status === "duplicate_candidate" || duplicate.isDuplicate ? 0.35 : 0;
  const confidenceScore = candidate.confidence * 0.3;
  const sourceScore = SOURCE_PRIORITY[sourceType ?? "OTHER"] ?? SOURCE_PRIORITY.OTHER;
  const graphScore = Math.min(0.17, relatedFacts.length * 0.03);
  return Math.round((duplicateScore + confidenceScore + sourceScore + graphScore) * 100) / 100;
}

function reason(candidate: FactCandidate, duplicate: FactDuplicateResult, relatedFacts: RelatedExistingFact[]) {
  return [
    `status=${candidate.status}`,
    `confidence=${candidate.confidence.toFixed(2)}`,
    duplicate.isDuplicate ? `duplicate=${duplicate.matchedFactIds.join(",")}` : "duplicate=none",
    relatedFacts.length ? `related=${relatedFacts.slice(0, 3).map((item) => item.factId).join(",")}` : "related=none"
  ].join("; ");
}
