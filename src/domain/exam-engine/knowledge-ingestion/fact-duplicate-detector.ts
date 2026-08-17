import type { AtomicFact } from "@/domain/exam-engine/types";
import type { FactCandidate, FactDuplicateResult } from "./knowledge-ingestion";

const DUPLICATE_THRESHOLD = 0.78;

export function detectDuplicateFact(candidate: FactCandidate, existingFacts: AtomicFact[]): FactDuplicateResult {
  const scored = existingFacts
    .map((fact) => ({ fact, score: duplicateScore(candidate, fact), reasons: duplicateReasons(candidate, fact) }))
    .filter((item) => item.score >= DUPLICATE_THRESHOLD)
    .sort((left, right) => right.score - left.score || left.fact.id.localeCompare(right.fact.id));

  return {
    isDuplicate: scored.length > 0,
    matchedFactIds: scored.map((item) => item.fact.id),
    confidence: scored[0]?.score ?? 0,
    reasons: scored[0]?.reasons ?? []
  };
}

function duplicateScore(candidate: FactCandidate, fact: AtomicFact) {
  const statement = similarity(candidate.statement, fact.statement);
  const concept = candidate.conceptHint && candidate.conceptHint === fact.conceptId ? 0.12 : 0;
  const predicate = candidate.statement.includes(fact.predicate) ? 0.08 : 0;
  const value = String(fact.value).length && candidate.statement.includes(String(fact.value)) ? 0.12 : 0;
  const unit = fact.unit && candidate.statement.includes(fact.unit) ? 0.06 : 0;
  const source = fact.sourceReferences.some((reference) => sameSource(reference, candidate.sourceReference)) ? 0.08 : 0;
  return clamp(statement * 0.68 + concept + predicate + value + unit + source);
}

function duplicateReasons(candidate: FactCandidate, fact: AtomicFact) {
  const reasons: string[] = [];
  if (similarity(candidate.statement, fact.statement) >= 0.7) reasons.push("similar statement");
  if (candidate.conceptHint && candidate.conceptHint === fact.conceptId) reasons.push("same concept");
  if (candidate.statement.includes(fact.predicate)) reasons.push("same predicate");
  if (String(fact.value).length && candidate.statement.includes(String(fact.value))) reasons.push("same value");
  if (fact.unit && candidate.statement.includes(fact.unit)) reasons.push("same unit");
  if (fact.sourceReferences.some((reference) => sameSource(reference, candidate.sourceReference))) reasons.push("same source reference");
  return reasons;
}

function sameSource(left: AtomicFact["sourceReferences"][number], right: FactCandidate["sourceReference"]) {
  return left.documentId === right.documentId && left.revisionId === right.revisionId && left.locator === right.locator;
}

function similarity(left: string, right: string) {
  const leftTokens = tokenize(left);
  const rightTokens = tokenize(right);
  if (!leftTokens.size || !rightTokens.size) return 0;
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return intersection / union;
}

function tokenize(value: string) {
  return new Set(value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((token) => token.length > 1));
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, Math.round(value * 100) / 100));
}
