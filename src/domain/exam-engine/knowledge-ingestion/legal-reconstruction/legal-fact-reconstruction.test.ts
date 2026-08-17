import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { AtomicFact, KnowledgeRelation } from "@/domain/exam-engine/types";
import type { FactCandidate, FactDuplicateResult } from "@/domain/exam-engine/knowledge-ingestion/knowledge-ingestion";
import { analyzeNewKnowledgeSource } from "@/domain/exam-engine/knowledge-ingestion/knowledge-expansion-pipeline";
import { detectDuplicateFact } from "@/domain/exam-engine/knowledge-ingestion/fact-duplicate-detector";
import { validateFactPromotion } from "@/domain/exam-engine/knowledge-ingestion/fact-promotion-validator";
import { findRelatedExistingFacts } from "@/domain/exam-engine/knowledge-ingestion/related-existing-facts";
import { decideFactPromotion } from "@/domain/exam-engine/knowledge-ingestion/auto-promotion";
import { benchmarkFactQuality } from "@/domain/exam-engine/knowledge-ingestion/quality-benchmark";
import type { FactQualityBenchmarkInput } from "@/domain/exam-engine/knowledge-ingestion/quality-benchmark";
import { pdfToKnowledgeSourceInput } from "@/domain/exam-engine/knowledge-ingestion/source/pdf-source-adapter";
import {
  buildLegalFactContexts,
  extractLegalConditions,
  linkLegalExceptions,
  parseLegalDocument,
  reconstructFactCandidate,
  reconstructFactCandidates
} from "./index";

const PACK_EXPORT_PATH = path.join(process.cwd(), "work", "exports", "prod-active-export-20260731-26approved.json");
const REPORT_PATH = path.join(process.cwd(), "docs", "legal-fact-reconstruction-report.md");

describe("Legal Fact Reconstruction", () => {
  it("parses article, paragraph, clause, and item structure from legal text", () => {
    const source = legalSource([
      "제1장 총칙",
      "제2조(정의) ① 초경량비행장치 조종자는 다음 각 호의 기준을 따라야 한다.",
      "1. 최대이륙중량 25kg 이하인 무인비행장치는 신고하여야 한다.",
      "가. 다만 시험비행의 경우에는 예외로 한다.",
      "제3조(증명) 조종자는 조종자 증명을 받아야 한다."
    ].join("\n"));

    const structure = parseLegalDocument(source);

    expect(structure.chapters.length).toBeGreaterThan(0);
    expect(structure.articles.length).toBeGreaterThanOrEqual(2);
    expect(structure.paragraphs.length).toBeGreaterThan(0);
    expect(structure.clauses.length).toBeGreaterThan(0);
    expect(structure.articles[0]?.sourceLocator).toContain("제2조");
  });

  it("extracts legal condition context and reconstructs a complete candidate", () => {
    const source = legalSource("제2조(신고) ① 초경량비행장치 조종자는 최대이륙중량 25kg 이하인 경우 신고하여야 한다. 다만 국가기관이 사용하는 경우는 제외한다.");
    const structure = parseLegalDocument(source);
    const [context] = buildLegalFactContexts(structure);
    const extraction = extractLegalConditions(context);
    const candidate = reconstructFactCandidate(source, context, 0);

    expect(extraction.subject).toBe("초경량비행장치 조종자");
    expect(extraction.action).toBe("신고하여야 한다");
    expect(extraction.threshold).toContain("25kg");
    expect(extraction.exceptions.length).toBeGreaterThan(0);
    expect(candidate?.statement).toContain("초경량비행장치 조종자");
    expect(candidate?.statement).toContain("25kg");
    expect(candidate?.statement).not.toBe("25kg 이하");
    expect(candidate?.legalContext?.sourceLocator).toContain("article:");
  });

  it("links exception candidates to article peers", () => {
    const source = legalSource("제5조(예외) ① 초경량비행장치 조종자는 안전성인증을 받아야 한다. ② 다만 일정한 경우에는 안전성인증 대상에서 제외한다.");
    const candidates = reconstructFactCandidates(source, buildLegalFactContexts(parseLegalDocument(source)));
    const links = linkLegalExceptions(candidates);

    expect(candidates.length).toBeGreaterThan(0);
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]?.relatedFactCandidateIds.length).toBeGreaterThan(0);
  });

  it("benchmarks the real law PDF before and after legal reconstruction and writes the report", () => {
    const pack = loadPack();
    const source = pdfToKnowledgeSourceInput(findAviationSafetyPdf(), {
      sourceId: "pdf-aviation-safety-act",
      sourceType: "LAW",
      title: "항공안전법 PDF",
      version: "real-source-v1",
      maxPages: 20,
      maxCharacters: 24000
    });

    const baselineExpansion = analyzeNewKnowledgeSource(source, pack.facts);
    const baselineCandidates = [
      ...baselineExpansion.newCandidates,
      ...baselineExpansion.reviewCandidates,
      ...baselineExpansion.duplicateCandidates
    ].slice(0, 200);
    const legalStructure = parseLegalDocument(source);
    const legalContexts = buildLegalFactContexts(legalStructure);
    const reconstructedCandidates = reconstructFactCandidates(source, legalContexts).slice(0, 200);

    const baseline = benchmarkCandidates(baselineCandidates, pack.facts, []);
    const reconstructed = benchmarkCandidates(reconstructedCandidates, pack.facts, []);

    expect(baselineCandidates.length).toBeGreaterThan(0);
    expect(reconstructedCandidates.length).toBeGreaterThan(0);
    expect(legalStructure.articles.length).toBeGreaterThan(0);
    expect(reconstructed.conditionRate).toBeGreaterThanOrEqual(baseline.conditionRate);
    expect(reconstructed.poorRate).toBeLessThanOrEqual(baseline.poorRate);
    expect(reconstructed.falseApproveRiskRate).toBeLessThanOrEqual(baseline.falseApproveRiskRate);

    fs.writeFileSync(REPORT_PATH, renderReport({
      sourcePath: findAviationSafetyPdf(),
      structure: {
        chapters: legalStructure.chapters.length,
        articles: legalStructure.articles.length,
        paragraphs: legalStructure.paragraphs.length,
        clauses: legalStructure.clauses.length,
        items: legalStructure.items.length
      },
      baseline,
      reconstructed,
      sampleCandidates: reconstructedCandidates.slice(0, 12)
    }), "utf8");
    expect(fs.existsSync(REPORT_PATH)).toBe(true);
  }, 150000);
});

function legalSource(content: string) {
  return {
    sourceId: "legal-source",
    sourceType: "LAW" as const,
    title: "항공안전법",
    version: "test",
    content,
    sourceReference: { documentId: "aviation-safety-act", locator: "법령:항공안전법" }
  };
}

function benchmarkCandidates(candidates: FactCandidate[], facts: AtomicFact[], relations: KnowledgeRelation[]) {
  const inputs = candidates.map((candidate) => qualityInput(candidate, facts, relations));
  const results = inputs.map(benchmarkFactQuality);
  const autoApproveResults = results.filter((result) => result.promotionDecision === "AUTO_APPROVE_CANDIDATE");
  const poorCount = results.filter((result) => result.qualityGrade === "POOR").length;
  const falseApproveRiskCount = autoApproveResults.filter((result) => result.riskLevel === "HIGH" || result.riskLevel === "CRITICAL").length;
  return {
    candidateCount: candidates.length,
    autoApproveCount: autoApproveResults.length,
    poorCount,
    poorRate: ratio(poorCount, candidates.length),
    falseApproveRiskCount,
    falseApproveRiskRate: ratio(falseApproveRiskCount, autoApproveResults.length),
    averageConfidence: average(candidates.map((candidate) => candidate.confidence)),
    numericRate: ratio(candidates.filter((candidate) => candidate.extractedNumbers.length > 0).length, candidates.length),
    conditionRate: ratio(candidates.filter((candidate) => candidate.extractedConditions.length > 0 || candidate.condition).length, candidates.length),
    exceptionRate: ratio(candidates.filter((candidate) => candidate.extractedExceptions.length > 0 || candidate.exception).length, candidates.length),
    results
  };
}

function qualityInput(candidate: FactCandidate, facts: AtomicFact[], relations: KnowledgeRelation[]): FactQualityBenchmarkInput {
  const duplicateResult = detectDuplicateFact(candidate, facts);
  const promotionDecision = promotionDecisionFor(candidate, duplicateResult, facts, relations);
  return { candidate, promotionDecision, duplicateResult, sourceType: "LAW" };
}

function promotionDecisionFor(candidate: FactCandidate, duplicateResult: FactDuplicateResult, facts: AtomicFact[], relations: KnowledgeRelation[]) {
  const relatedFacts = findRelatedExistingFacts(candidate, facts, relations);
  return decideFactPromotion(candidate, {
    validation: validateFactPromotion(candidate, facts),
    duplicateResult,
    sourceType: "LAW",
    graphContext: {
      relatedFactCount: relatedFacts.length,
      compatibleRelationCount: Math.min(5, relatedFacts.length),
      contradictionCount: 0,
      examValueScore: candidate.confidence,
      expectedQuestionIncrease: Math.min(5, candidate.extractedNumbers.length + candidate.extractedConditions.length + 1),
      expectedCoverageIncrease: Number(Boolean(candidate.categoryHint)) + Number(Boolean(candidate.conceptHint))
    }
  });
}

function loadPack() {
  const raw = JSON.parse(fs.readFileSync(PACK_EXPORT_PATH, "utf8"));
  const pack = raw.pack?.pack ?? raw.pack ?? raw;
  return {
    facts: pack.atomicFacts as AtomicFact[]
  };
}

function findAviationSafetyPdf() {
  const docsPath = path.join(process.cwd(), "docs");
  const pdfName = fs.readdirSync(docsPath).find((name) => name.includes("항공안전법") && name.endsWith(".pdf"));
  if (!pdfName) throw new Error("항공안전법 PDF를 docs 폴더에서 찾지 못했습니다.");
  return path.join(docsPath, pdfName);
}

function renderReport(input: {
  sourcePath: string;
  structure: { chapters: number; articles: number; paragraphs: number; clauses: number; items: number };
  baseline: ReturnType<typeof benchmarkCandidates>;
  reconstructed: ReturnType<typeof benchmarkCandidates>;
  sampleCandidates: FactCandidate[];
}) {
  return [
    "# Legal Fact Reconstruction Report",
    "",
    "## 기존 문제",
    "",
    "- 기존 PDF 후보 생성은 문장 단위 분할에 가까워 조문·항·호 문맥이 분리될 수 있었다.",
    "- 숫자와 단위만 남은 후보는 sourceReference가 있어도 주체, 조건, 예외가 불완전해 AUTO_APPROVE false approve risk를 높였다.",
    "",
    "## Parser 구조",
    "",
    "- PDF Source Adapter는 그대로 유지하고, LAW source에 대해 별도 legal reconstruction pipeline을 추가했다.",
    "- 인식 단위: Document -> Chapter -> Article -> Paragraph -> Clause -> Item.",
    "- 인식 cue: 제X조, 제X조의X, 제X장/제X절, ①~⑳, 1., 가., (1), 별표/부칙 문맥.",
    `- 실제 파싱 결과: chapters ${input.structure.chapters}, articles ${input.structure.articles}, paragraphs ${input.structure.paragraphs}, clauses ${input.structure.clauses}, items ${input.structure.items}.`,
    "",
    "## Reconstruction 방식",
    "",
    "- Article 전체 문맥을 FactContext.fullArticleText에 보존한다.",
    "- Clause 단위 후보를 만들되 sourceLocator는 article/paragraph/clause 경로로 유지한다.",
    "- FactCandidate에 legalSubject, legalAction, condition, exception, threshold, applicability, legalContext를 optional metadata로 추가했다.",
    "- AtomicFact와 KnowledgePack schema는 변경하지 않았다.",
    "",
    "## Condition / Exception 처리",
    "",
    "- 조건 cue: 경우, 때, 이상, 이하, 초과, 미만, 따른, 해당, 까지, 이내, 대상, 조건.",
    "- 예외 cue: 다만, 단, 제외, 예외, 아니하다, 아니 된다, 불구하고.",
    "- 예외가 있는 후보는 같은 article peer 후보와 LegalExceptionLink로 연결한다.",
    "",
    "## Before / After 품질 비교",
    "",
    table(["Metric", "Before sentence extractor", "After legal reconstruction"], [
      ["Candidate count", String(input.baseline.candidateCount), String(input.reconstructed.candidateCount)],
      ["Numeric rate", percent(input.baseline.numericRate), percent(input.reconstructed.numericRate)],
      ["Condition rate", percent(input.baseline.conditionRate), percent(input.reconstructed.conditionRate)],
      ["Exception rate", percent(input.baseline.exceptionRate), percent(input.reconstructed.exceptionRate)],
      ["AUTO_APPROVE count", String(input.baseline.autoApproveCount), String(input.reconstructed.autoApproveCount)],
      ["POOR count", String(input.baseline.poorCount), String(input.reconstructed.poorCount)],
      ["POOR rate", percent(input.baseline.poorRate), percent(input.reconstructed.poorRate)],
      ["False approve risk count", String(input.baseline.falseApproveRiskCount), String(input.reconstructed.falseApproveRiskCount)],
      ["False approve risk rate", percent(input.baseline.falseApproveRiskRate), percent(input.reconstructed.falseApproveRiskRate)],
      ["Average confidence", input.baseline.averageConfidence.toFixed(3), input.reconstructed.averageConfidence.toFixed(3)]
    ]),
    "",
    "## Reconstructed Candidate Sample",
    "",
    table(["Candidate", "Statement", "Locator", "Condition", "Exception"], input.sampleCandidates.map((candidate) => [
      candidate.candidateId,
      candidate.statement.slice(0, 140),
      candidate.sourceReference.locator,
      candidate.condition?.slice(0, 80) ?? "-",
      candidate.exception?.slice(0, 80) ?? "-"
    ])),
    "",
    "## Quality 변화",
    "",
    `- POOR 변화: ${input.baseline.poorCount} -> ${input.reconstructed.poorCount}.`,
    `- False approve risk 변화: ${input.baseline.falseApproveRiskCount} -> ${input.reconstructed.falseApproveRiskCount}.`,
    `- 조건 포함률 변화: ${percent(input.baseline.conditionRate)} -> ${percent(input.reconstructed.conditionRate)}.`,
    "",
    "## 남은 문제",
    "",
    "- PDF text extraction 자체의 줄바꿈·띄어쓰기 오류는 완전히 제거하지 못한다.",
    "- 조문 제목과 본문이 페이지 경계에서 분리되는 경우 locator는 article 기준으로 보수적으로 유지한다.",
    "- 별표 표 구조는 텍스트 추출 품질에 따라 추가 table-aware parser가 필요할 수 있다.",
    "- Auto Promotion 기준값은 변경하지 않았다. legal reconstruction signal은 현재 advisory metadata다.",
    "",
    "## Data Safety",
    "",
    "- AtomicFact 생성/수정: 수행하지 않음.",
    "- Fact status 변경: 수행하지 않음.",
    "- KnowledgePack 변경: 수행하지 않음.",
    "- Graph/Graph Version 변경: 수행하지 않음.",
    "- Question DB 저장: 수행하지 않음.",
    "- Supabase 변경: 수행하지 않음."
  ].join("\n") + "\n";
}

function table(headers: string[], rows: string[][]) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map((value) => value.replaceAll("|", "\\|")).join(" | ")} |`)
  ].join("\n");
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function ratio(value: number, total: number) {
  return total ? value / total : 0;
}

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}
