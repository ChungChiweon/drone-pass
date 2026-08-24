import type { FactCandidate } from "@/domain/exam-engine/knowledge-ingestion/knowledge-ingestion";
import type { FactNoveltyScore, KnowledgeExpansionScoringContext } from "./expansion-intelligence";

export function detectFactNovelty(candidate: FactCandidate, context: KnowledgeExpansionScoringContext): FactNoveltyScore {
  const reasons: string[] = [];
  const signals = context.existingFactSignals ?? [];
  const sameConcept = signals.filter((signal) => signal.conceptId && signal.conceptId === candidate.conceptHint).length;
  const sameSource = signals.filter((signal) => signal.sourceDocumentId && signal.sourceDocumentId === candidate.sourceReference.documentId).length;
  const sameValue = signals.filter((signal) => signal.value !== undefined && candidate.statement.includes(String(signal.value))).length;
  const duplicateRisk = Math.min(1, (sameConcept > 0 ? 0.25 : 0) + Math.min(0.25, sameSource * 0.03) + Math.min(0.25, sameValue * 0.05));

  let noveltyScore = 0.45;
  if (candidate.categoryHint && !(context.existingCategoryIds ?? []).includes(candidate.categoryHint)) {
    noveltyScore += 0.2;
    reasons.push("new category");
  }
  if (candidate.conceptHint && !(context.existingConceptIds ?? []).includes(candidate.conceptHint)) {
    noveltyScore += 0.2;
    reasons.push("new concept");
  }
  if (candidate.extractedNumbers.length > 0 && sameValue === 0) {
    noveltyScore += 0.12;
    reasons.push("new numeric threshold");
  }
  if (candidate.extractedExceptions.length > 0) {
    noveltyScore += 0.08;
    reasons.push("new exception signal");
  }
  if (/사업|자격|벌칙|과태료|승인|신고|등록/.test(candidate.statement)) {
    noveltyScore += 0.07;
    reasons.push("new legal/exam topic signal");
  }

  noveltyScore = Math.max(0, noveltyScore - duplicateRisk);
  if (sameConcept > 0) reasons.push(`same concept count=${sameConcept}`);
  if (sameSource > 0) reasons.push(`same source count=${sameSource}`);
  if (sameValue > 0) reasons.push(`same value count=${sameValue}`);

  return {
    noveltyScore: round(Math.min(1, noveltyScore)),
    duplicateRisk: round(duplicateRisk),
    reasons
  };
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
