import type { FactCandidate } from "@/domain/exam-engine/knowledge-ingestion/knowledge-ingestion";
import type { LegalExceptionLink } from "./legal-document-structure";

export function linkLegalExceptions(candidates: FactCandidate[]): LegalExceptionLink[] {
  return candidates
    .filter((candidate) => candidate.extractedExceptions.length > 0 || candidate.exception)
    .map((candidate, index) => {
      const articleId = candidate.legalContext?.articleId;
      const related = candidates
        .filter((item) => item.candidateId !== candidate.candidateId && item.legalContext?.articleId === articleId)
        .map((item) => item.candidateId);
      return {
        exceptionGroupId: `LEXG-${String(index + 1).padStart(3, "0")}`,
        baseCandidateId: candidate.candidateId,
        relatedFactCandidateIds: related,
        exceptionTexts: candidate.extractedExceptions.length ? candidate.extractedExceptions : [candidate.exception ?? ""].filter(Boolean)
      };
    });
}
