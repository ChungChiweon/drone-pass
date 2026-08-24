import type { AtomicFact } from "@/domain/exam-engine/types";
import { detectDuplicateFact } from "./fact-duplicate-detector";
import type { FactCandidate, KnowledgeExpansionResult, KnowledgeSourceInput } from "./knowledge-ingestion";

export function analyzeNewKnowledgeSource(
  source: KnowledgeSourceInput,
  existingFacts: AtomicFact[]
): KnowledgeExpansionResult {
  const candidates = extractCandidates(source);
  const reviewed = candidates.map((candidate) => {
    const duplicate = detectDuplicateFact(candidate, existingFacts);
    if (duplicate.isDuplicate) return { ...candidate, status: "duplicate_candidate" as const };
    if (candidate.confidence >= 0.55) return { ...candidate, status: "review_candidate" as const };
    return { ...candidate, status: "draft" as const };
  });

  return {
    sourceId: source.sourceId,
    newCandidates: reviewed.filter((candidate) => candidate.status === "draft"),
    duplicateCandidates: reviewed.filter((candidate) => candidate.status === "duplicate_candidate"),
    reviewCandidates: reviewed.filter((candidate) => candidate.status === "review_candidate"),
    rejectedCandidates: []
  };
}

function extractCandidates(source: KnowledgeSourceInput): FactCandidate[] {
  return splitStatements(source.content).map((statement, index) => {
    const extractedNumbers = [...statement.matchAll(/\d+(?:\.\d+)?\s?(?:kg|g|킬로그램|개월|일|년|만원|원|시간|m|미터)?/g)].map((match) => match[0].trim());
    return {
      candidateId: `${source.sourceId}:candidate-${String(index + 1).padStart(3, "0")}`,
      sourceId: source.sourceId,
      statement,
      conceptHint: inferConceptHint(statement),
      categoryHint: inferCategoryHint(statement),
      extractedNumbers,
      extractedConditions: extractPhrases(statement, ["경우", "조건", "이상", "이하", "초과", "미만", "해당", "따른", "하여야", "금지"]),
      extractedExceptions: extractPhrases(statement, ["제외", "예외", "다만", "아니하다"]),
      confidence: scoreCandidate(statement, extractedNumbers),
      sourceReference: source.sourceReference,
      status: "draft"
    };
  });
}

function splitStatements(content: string) {
  return content
    .split(/[\n.;。]+/g)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length >= 8);
}

function scoreCandidate(statement: string, numbers: string[]) {
  const legalCue = /(하여야|금지|신고|등록|승인|자격|증명|벌금|과태료|취소|정지|이상|이하|초과|미만|항공안전법|항공사업법|시행령|시행규칙)/.test(statement) ? 0.3 : 0;
  const numericCue = numbers.length ? 0.2 : 0;
  const lengthCue = statement.length >= 20 ? 0.2 : 0.1;
  return Math.min(0.95, Math.round((0.25 + legalCue + numericCue + lengthCue) * 100) / 100);
}

function inferConceptHint(statement: string) {
  if (statement.includes("신고") || statement.includes("등록")) return "concept:report";
  if (statement.includes("자격") || statement.includes("증명") || statement.includes("조종")) return "concept:qualification";
  if (statement.includes("승인") || statement.includes("허가")) return "concept:approval";
  if (statement.includes("벌금") || statement.includes("과태료") || statement.includes("취소") || statement.includes("정지") || statement.includes("처벌")) return "concept:penalty";
  if (statement.includes("안전성")) return "concept:safety-certification";
  if (statement.includes("준수사항") || statement.includes("비행") || statement.includes("운항")) return "concept:operation";
  return undefined;
}

function inferCategoryHint(statement: string) {
  if (statement.includes("신고") || statement.includes("등록")) return "cat-report-procedure";
  if (statement.includes("자격") || statement.includes("증명") || statement.includes("조종")) return "cat-pilot-certificate-target";
  if (statement.includes("승인") || statement.includes("허가")) return "cat-flight-approval";
  if (statement.includes("벌금") || statement.includes("과태료") || statement.includes("취소") || statement.includes("정지") || statement.includes("처벌")) return "cat-penalty-core";
  if (statement.includes("안전성")) return "cat-safety-certification";
  if (statement.includes("준수사항") || statement.includes("비행") || statement.includes("운항")) return "cat-pilot-compliance-flight";
  return undefined;
}

function extractPhrases(statement: string, cues: string[]) {
  return cues.filter((cue) => statement.includes(cue));
}
