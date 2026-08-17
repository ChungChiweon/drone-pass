import type { FactCandidate } from "@/domain/exam-engine/knowledge-ingestion/knowledge-ingestion";

export type SourceConflictSeverity = "LOW" | "MEDIUM" | "HIGH";

export type SourceConflict = {
  conflictId: string;
  candidateIds: string[];
  severity: SourceConflictSeverity;
  conflictType: "NUMERIC_MISMATCH" | "DATE_MISMATCH" | "CONDITION_MISMATCH" | "EXCEPTION_CONFLICT" | "EXPRESSION_VARIANCE";
  reason: string;
};

export function detectSourceConflicts(candidates: FactCandidate[]): SourceConflict[] {
  const conflicts: SourceConflict[] = [];
  for (let index = 0; index < candidates.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < candidates.length; otherIndex += 1) {
      const conflict = detectPairConflict(candidates[index], candidates[otherIndex]);
      if (conflict) conflicts.push(conflict);
    }
  }
  return conflicts;
}

function detectPairConflict(left: FactCandidate, right: FactCandidate): SourceConflict | null {
  const pair = [left.candidateId, right.candidateId];
  const leftNumbers = normalizedNumbers(left);
  const rightNumbers = normalizedNumbers(right);
  if (leftNumbers.length && rightNumbers.length && intersects(textTokens(left.statement), textTokens(right.statement)) && !sameSet(leftNumbers, rightNumbers)) {
    return conflict(pair, "HIGH", "NUMERIC_MISMATCH", `numeric values differ: ${leftNumbers.join(",")} vs ${rightNumbers.join(",")}`);
  }
  const leftDates = dateSignals(left);
  const rightDates = dateSignals(right);
  if (leftDates.length && rightDates.length && !sameSet(leftDates, rightDates)) {
    return conflict(pair, "HIGH", "DATE_MISMATCH", `date signals differ: ${leftDates.join(",")} vs ${rightDates.join(",")}`);
  }
  if (left.extractedConditions.length && right.extractedConditions.length && !sameSet(left.extractedConditions, right.extractedConditions) && similarEnough(left, right)) {
    return conflict(pair, "HIGH", "CONDITION_MISMATCH", "condition signals differ for similar fact pattern");
  }
  if (left.extractedExceptions.length !== right.extractedExceptions.length && similarEnough(left, right)) {
    return conflict(pair, "HIGH", "EXCEPTION_CONFLICT", "exception coverage differs for similar fact pattern");
  }
  if (similarEnough(left, right) && left.statement !== right.statement) {
    return conflict(pair, "MEDIUM", "EXPRESSION_VARIANCE", "wording differs but no hard value conflict was detected");
  }
  return null;
}

function conflict(candidateIds: string[], severity: SourceConflictSeverity, conflictType: SourceConflict["conflictType"], reason: string): SourceConflict {
  return {
    conflictId: `conflict-${candidateIds.join("-")}-${conflictType}`,
    candidateIds,
    severity,
    conflictType,
    reason
  };
}

function normalizedNumbers(candidate: FactCandidate) {
  const fromExtracted = candidate.extractedNumbers.flatMap((value) => [...value.matchAll(/\d+(?:\.\d+)?/g)].map((match) => match[0]));
  const fromStatement = [...candidate.statement.matchAll(/\d+(?:\.\d+)?/g)].map((match) => match[0]);
  return [...new Set([...fromExtracted, ...fromStatement])];
}

function dateSignals(candidate: FactCandidate) {
  return [...candidate.statement.matchAll(/\d{4}-\d{2}-\d{2}|\d{1,2}월\s*\d{1,2}일/g)].map((match) => match[0].replace(/\s+/g, ""));
}

function similarEnough(left: FactCandidate, right: FactCandidate) {
  return left.conceptHint && left.conceptHint === right.conceptHint
    || left.categoryHint && left.categoryHint === right.categoryHint
    || intersects(textTokens(left.statement), textTokens(right.statement));
}

function textTokens(value: string) {
  return new Set(value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((token) => token.length > 1));
}

function intersects(left: Set<string>, right: Set<string>) {
  return [...left].some((token) => right.has(token));
}

function sameSet(left: string[], right: string[]) {
  return left.length === right.length && left.every((value) => right.includes(value));
}
