import type { FactCandidate, KnowledgeSourceInput } from "@/domain/exam-engine/knowledge-ingestion/knowledge-ingestion";
import type { FactContext } from "./legal-document-structure";
import { extractLegalConditions } from "./legal-condition-extractor";

export function reconstructFactCandidate(source: KnowledgeSourceInput, context: FactContext, index: number): FactCandidate | null {
  const extraction = extractLegalConditions(context);
  const baseText = context.clause?.text ?? context.paragraph?.text ?? context.article.text;
  if (!isFactLike(baseText, extraction)) return null;

  const statement = buildStatement(baseText, extraction);
  const sourceLocator = context.clause?.sourceLocator ?? context.paragraph?.sourceLocator ?? context.article.sourceLocator;
  return {
    candidateId: `${source.sourceId}:legal-candidate-${String(index + 1).padStart(3, "0")}`,
    sourceId: source.sourceId,
    statement,
    legalSubject: extraction.subject,
    legalAction: extraction.action,
    condition: extraction.conditions[0],
    exception: extraction.exceptions[0],
    threshold: extraction.threshold,
    applicability: extraction.applicability,
    legalContext: {
      articleId: context.article.id,
      paragraphId: context.paragraph?.id,
      clauseId: context.clause?.id,
      sourceLocator,
      fullArticleText: context.fullArticleText
    },
    conceptHint: inferConceptHint(statement, extraction.applicability),
    categoryHint: inferCategoryHint(statement, extraction.applicability),
    extractedNumbers: extraction.numbers,
    extractedConditions: extraction.conditions,
    extractedExceptions: extraction.exceptions,
    confidence: scoreReconstructedCandidate(statement, extraction),
    sourceReference: {
      ...source.sourceReference,
      locator: sourceLocator
    },
    status: "draft"
  };
}

export function reconstructFactCandidates(source: KnowledgeSourceInput, contexts: FactContext[]): FactCandidate[] {
  return contexts
    .map((context, index) => reconstructFactCandidate(source, context, index))
    .filter((candidate): candidate is FactCandidate => Boolean(candidate));
}

function isFactLike(text: string, extraction: ReturnType<typeof extractLegalConditions>) {
  return Boolean(extraction.subject || extraction.action || extraction.numbers.length || /(하여야|금지|신고|허가|승인|증명|인증|벌금|과태료|취소|정지)/.test(text));
}

function buildStatement(text: string, extraction: ReturnType<typeof extractLegalConditions>) {
  const subject = extraction.subject ?? inferSubjectText(text);
  const action = extraction.action ?? inferActionText(text);
  const condition = extraction.conditions[0] ? ` ${summarize(extraction.conditions[0])}` : "";
  const threshold = extraction.threshold ? ` 기준값 ${extraction.threshold}` : "";
  const exception = extraction.exceptions[0] ? ` 다만 ${summarize(extraction.exceptions[0])}` : "";
  return `${subject}는${condition}${threshold}에 관하여 ${action}.${exception}`.replace(/\s+/g, " ").trim();
}

function inferSubjectText(text: string) {
  if (text.includes("국토교통부장관")) return "국토교통부장관";
  if (text.includes("조종자")) return "조종자";
  if (text.includes("소유자")) return "초경량비행장치 소유자등";
  if (text.includes("사업")) return "항공 관련 사업자";
  return "해당 법령 대상자";
}

function inferActionText(text: string) {
  if (text.includes("받")) return "필요한 증명 또는 인증을 받아야 한다";
  if (text.includes("신고")) return "신고 의무를 이행하여야 한다";
  if (text.includes("금지") || text.includes("아니 된다")) return "해당 행위를 하여서는 아니 된다";
  if (text.includes("취소") || text.includes("정지")) return "취소 또는 효력정지 대상이 될 수 있다";
  if (text.includes("제출")) return "필요한 서류를 제출하여야 한다";
  return "해당 법령 기준을 적용받는다";
}

function inferConceptHint(statement: string, applicability?: string) {
  const text = `${statement} ${applicability ?? ""}`;
  if (text.includes("신고") || text.includes("등록")) return "concept:report";
  if (text.includes("조종자") || text.includes("증명") || text.includes("자격")) return "concept:qualification";
  if (text.includes("승인") || text.includes("허가")) return "concept:approval";
  if (text.includes("안전성인증") || text.includes("인증")) return "concept:safety-certification";
  if (text.includes("벌금") || text.includes("과태료") || text.includes("취소") || text.includes("정지")) return "concept:penalty";
  if (text.includes("비행")) return "concept:operation";
  return undefined;
}

function inferCategoryHint(statement: string, applicability?: string) {
  const text = `${statement} ${applicability ?? ""}`;
  if (text.includes("신고") || text.includes("등록")) return "cat-report-procedure";
  if (text.includes("조종자") || text.includes("증명") || text.includes("자격")) return "cat-pilot-certificate-target";
  if (text.includes("승인") || text.includes("허가")) return "cat-flight-approval";
  if (text.includes("안전성인증") || text.includes("인증")) return "cat-safety-certification";
  if (text.includes("벌금") || text.includes("과태료") || text.includes("취소") || text.includes("정지")) return "cat-penalty-core";
  if (text.includes("비행")) return "cat-pilot-compliance-flight";
  return undefined;
}

function scoreReconstructedCandidate(statement: string, extraction: ReturnType<typeof extractLegalConditions>) {
  let score = 0.45;
  if (extraction.subject) score += 0.12;
  if (extraction.action) score += 0.12;
  if (extraction.conditions.length) score += 0.1;
  if (extraction.numbers.length) score += 0.08;
  if (extraction.exceptions.length) score += 0.06;
  if (statement.length >= 35) score += 0.07;
  return Math.min(0.95, Math.round(score * 100) / 100);
}

function summarize(value: string) {
  return value.replace(/\s+/g, " ").slice(0, 90);
}
