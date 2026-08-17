import type { FactCandidate, FactDuplicateResult } from "@/domain/exam-engine/knowledge-ingestion/knowledge-ingestion";
import type { CandidateQualityValidation, ValidationSignal } from "./fact-quality-benchmark";

export function validateAutoApproveCandidate(
  candidate: FactCandidate,
  duplicateResult: FactDuplicateResult,
  sourceType: "LAW" | "REGULATION" | "TEXTBOOK" | "EXAM" | "OTHER"
): CandidateQualityValidation {
  const validationSignals = buildSignals(candidate, duplicateResult, sourceType);
  const issues = issuesFor(validationSignals, candidate, sourceType);
  const score = qualityScore(validationSignals, issues);
  return {
    candidateId: candidate.candidateId,
    validationSignals,
    issues,
    score
  };
}

function buildSignals(candidate: FactCandidate, duplicateResult: FactDuplicateResult, sourceType: string): ValidationSignal {
  return {
    sourceValid: Boolean(candidate.sourceReference.documentId && candidate.sourceReference.locator && sourceType),
    statementComplete: isCompleteStatement(candidate.statement),
    subjectPresent: hasSubjectCue(candidate.statement),
    conditionRisk: hasConditionRisk(candidate),
    numericConsistent: numericConsistent(candidate),
    operatorCuePresent: operatorCuePresent(candidate.statement),
    legalCuePresent: legalCuePresent(candidate.statement, sourceType),
    articleCuePresent: articleCuePresent(candidate.statement, candidate.sourceReference.locator),
    exceptionCuePresent: exceptionCuePresent(candidate),
    duplicateRisk: duplicateResult.isDuplicate || duplicateResult.confidence >= 0.75
  };
}

function issuesFor(signals: ValidationSignal, candidate: FactCandidate, sourceType: string) {
  const issues: string[] = [];
  if (!signals.sourceValid) issues.push("sourceReference or sourceType missing");
  if (!signals.statementComplete) issues.push("statement may be incomplete");
  if (!signals.subjectPresent) issues.push("subject cue missing");
  if (signals.conditionRisk) issues.push("condition cue exists but may be truncated or underspecified");
  if (!signals.numericConsistent) issues.push("numeric value/unit consistency risk");
  if (candidate.extractedNumbers.length > 0 && !signals.operatorCuePresent) issues.push("numeric fact lacks operator cue");
  if (!signals.legalCuePresent) issues.push(`legal cue weak for sourceType=${sourceType}`);
  if (!signals.articleCuePresent) issues.push("article/table/locator cue missing");
  if (signals.duplicateRisk) issues.push("duplicate similarity risk");
  return issues;
}

function qualityScore(signals: ValidationSignal, issues: string[]) {
  let score = 0;
  if (signals.sourceValid) score += 0.16;
  if (signals.statementComplete) score += 0.16;
  if (signals.subjectPresent) score += 0.12;
  if (!signals.conditionRisk) score += 0.1;
  if (signals.numericConsistent) score += 0.14;
  if (signals.operatorCuePresent) score += 0.1;
  if (signals.legalCuePresent) score += 0.12;
  if (signals.articleCuePresent) score += 0.06;
  if (!signals.duplicateRisk) score += 0.04;
  return round(Math.max(0, Math.min(1, score - Math.min(0.2, issues.length * 0.02))));
}

function isCompleteStatement(statement: string) {
  return statement.trim().length >= 18 && !/[,:，]$/.test(statement.trim());
}

function hasSubjectCue(statement: string) {
  return /(초경량비행장치|무인비행장치|무인동력비행장치|조종자|소유자|사업자|국토교통부|한국교통안전공단|비행장치)/.test(statement);
}

function hasConditionRisk(candidate: FactCandidate) {
  if (candidate.extractedConditions.length === 0) return false;
  return candidate.statement.length < 35 || /(경우|다만|따른)$/.test(candidate.statement.trim());
}

function numericConsistent(candidate: FactCandidate) {
  if (candidate.extractedNumbers.length === 0) return true;
  return candidate.extractedNumbers.every((number) => candidate.statement.includes(number));
}

function operatorCuePresent(statement: string) {
  return /(이상|이하|초과|미만|까지|이내|이전|후|부터|한도|이내|이상인|이하인)/.test(statement);
}

function legalCuePresent(statement: string, sourceType: string) {
  if (sourceType === "LAW" || sourceType === "REGULATION") return /(법|시행령|시행규칙|조|항|호|별표|국토교통부령|대통령령)/.test(statement);
  return /(시험|교육|안내|기준|절차|요건)/.test(statement);
}

function articleCuePresent(statement: string, locator: string) {
  return /(제\s*\d+\s*조|제\d+조|제\s*\d+\s*항|제\d+항|제\s*\d+\s*호|제\d+호|별표|표)/.test(`${statement} ${locator}`);
}

function exceptionCuePresent(candidate: FactCandidate) {
  return candidate.extractedExceptions.length > 0 || /(다만|제외|예외|아니하다)/.test(candidate.statement);
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
