import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { AtomicFact } from "@/domain/exam-engine/types";
import type { FactCandidate, FactDuplicateResult } from "@/domain/exam-engine/knowledge-ingestion/knowledge-ingestion";
import { analyzeNewKnowledgeSource } from "@/domain/exam-engine/knowledge-ingestion/knowledge-expansion-pipeline";
import { detectDuplicateFact } from "@/domain/exam-engine/knowledge-ingestion/fact-duplicate-detector";
import { validateFactPromotion } from "@/domain/exam-engine/knowledge-ingestion/fact-promotion-validator";
import { decideFactPromotion } from "@/domain/exam-engine/knowledge-ingestion/auto-promotion";
import { benchmarkFactQuality } from "@/domain/exam-engine/knowledge-ingestion/quality-benchmark";
import type { FactQualityBenchmarkInput } from "@/domain/exam-engine/knowledge-ingestion/quality-benchmark";
import { pdfToKnowledgeSourceInput } from "@/domain/exam-engine/knowledge-ingestion/source/pdf-source-adapter";
import { buildLegalFactContexts, parseLegalDocument, reconstructFactCandidates } from "@/domain/exam-engine/knowledge-ingestion/legal-reconstruction";
import {
  detectEncodingQuality,
  extractPdfTables,
  extractPdfWithQuality,
  normalizePdfText,
  numericPreservationRate,
  parseLegalTables,
  pdfQualityResultToKnowledgeSourceInput,
  preserveNumbers
} from "./index";

const PACK_EXPORT_PATH = path.join(process.cwd(), "work", "exports", "prod-active-export-20260731-26approved.json");
const REPORT_PATH = path.join(process.cwd(), "docs", "pdf-extraction-quality-report.md");

describe("PDF Extraction Quality Layer", () => {
  it("normalizes text spacing and preserves numeric operator context", () => {
    const normalized = normalizePdfText("초경량비행장치\n25 kg 이 하\n신 고 하 여 야 한다");
    const numbers = preserveNumbers(normalized, "PDF:test");

    expect(normalized).toContain("25kg 이하");
    expect(numbers.some((number) => number.value === 25 && number.unit === "kg" && number.operator === "LESS_EQUAL")).toBe(true);
  });

  it("detects encoding corruption and affected pages", () => {
    const quality = detectEncodingQuality([
      { pageNumber: 1, text: "정상 한글 조문" },
      { pageNumber: 2, text: "??났?덉쟾踰?���" }
    ]);

    expect(quality.corruptedCharacters).toBeGreaterThan(0);
    expect(quality.affectedPages).toContain(2);
    expect(quality.score).toBeLessThan(1);
  });

  it("extracts table-like structure and legal table cells", () => {
    const text = [
      "사업종류  법인  개인",
      "대여업  2억5천만원  3억7천500만원",
      "사용사업  3천만원  3천만원"
    ].join("\n");
    const tables = extractPdfTables(text, "table-source");
    const legalCells = parseLegalTables(tables);

    expect(tables.length).toBe(1);
    expect(tables[0]?.headers).toContain("사업종류");
    expect(legalCells.some((cell) => cell.category === "REGISTRATION_REQUIREMENT")).toBe(true);
    expect(legalCells.some((cell) => cell.value.includes("2억5천만원"))).toBe(true);
  });

  it("runs the real aviation safety PDF through quality extraction and writes the report", () => {
    const pack = loadPack();
    const pdfPath = findAviationSafetyPdf();
    const beforeSource = pdfToKnowledgeSourceInput(pdfPath, {
      sourceId: "pdf-aviation-safety-act",
      sourceType: "LAW",
      title: "항공안전법 PDF",
      version: "real-source-v1",
      maxPages: 20,
      maxCharacters: 24000
    });
    const qualityResult = extractPdfWithQuality(pdfPath, {
      sourceId: "pdf-aviation-safety-act",
      sourceType: "LAW",
      title: "항공안전법 PDF",
      version: "quality-v1",
      maxPages: 20,
      maxCharacters: 24000
    });
    const afterSource = pdfQualityResultToKnowledgeSourceInput(pdfPath, qualityResult, {
      sourceType: "LAW",
      title: "항공안전법 PDF",
      version: "quality-v1"
    });

    const beforeCandidates = candidatesFromSource(beforeSource, pack.facts).slice(0, 200);
    const afterStructure = parseLegalDocument(afterSource);
    const afterCandidates = reconstructFactCandidates(afterSource, buildLegalFactContexts(afterStructure)).slice(0, 200);
    const beforeQuality = qualitySummary(beforeCandidates, pack.facts);
    const afterQuality = qualitySummary(afterCandidates, pack.facts);

    expect(qualityResult.normalizedText.length).toBeGreaterThan(100);
    expect(qualityResult.preservedNumbers.length).toBeGreaterThan(0);
    expect(qualityResult.extractionQualityScore.overallScore).toBeGreaterThan(0);
    expect(numericPreservationRate(qualityResult.extractedText, qualityResult.normalizedText)).toBeGreaterThan(0.8);
    expect(afterQuality.falseApproveRiskRate).toBeLessThanOrEqual(beforeQuality.falseApproveRiskRate);

    fs.writeFileSync(REPORT_PATH, renderReport({
      pdfPath,
      qualityResult,
      beforeQuality,
      afterQuality,
      beforeCandidateCount: beforeCandidates.length,
      afterCandidateCount: afterCandidates.length,
      normalizedSample: qualityResult.normalizedText.slice(0, 700)
    }), "utf8");
    expect(fs.existsSync(REPORT_PATH)).toBe(true);
  }, 150000);
});

function candidatesFromSource(source: ReturnType<typeof pdfToKnowledgeSourceInput>, facts: AtomicFact[]) {
  const expansion = analyzeNewKnowledgeSource(source, facts);
  return [...expansion.newCandidates, ...expansion.reviewCandidates, ...expansion.duplicateCandidates];
}

function qualitySummary(candidates: FactCandidate[], facts: AtomicFact[]) {
  const inputs = candidates.map((candidate) => qualityInput(candidate, facts));
  const results = inputs.map(benchmarkFactQuality);
  const auto = results.filter((result) => result.promotionDecision === "AUTO_APPROVE_CANDIDATE");
  const poor = results.filter((result) => result.qualityGrade === "POOR");
  const riskyAuto = auto.filter((result) => result.riskLevel === "HIGH" || result.riskLevel === "CRITICAL");
  return {
    autoApproveCount: auto.length,
    poorCount: poor.length,
    falseApproveRiskCount: riskyAuto.length,
    falseApproveRiskRate: auto.length ? riskyAuto.length / auto.length : 0,
    numericRate: candidates.length ? candidates.filter((candidate) => candidate.extractedNumbers.length > 0).length / candidates.length : 0,
    conditionRate: candidates.length ? candidates.filter((candidate) => candidate.extractedConditions.length > 0 || candidate.condition).length / candidates.length : 0,
    exceptionRate: candidates.length ? candidates.filter((candidate) => candidate.extractedExceptions.length > 0 || candidate.exception).length / candidates.length : 0
  };
}

function qualityInput(candidate: FactCandidate, facts: AtomicFact[]): FactQualityBenchmarkInput {
  const duplicateResult = detectDuplicateFact(candidate, facts);
  return {
    candidate,
    duplicateResult,
    sourceType: "LAW",
    promotionDecision: promotionDecisionFor(candidate, duplicateResult, facts)
  };
}

function promotionDecisionFor(candidate: FactCandidate, duplicateResult: FactDuplicateResult, facts: AtomicFact[]) {
  return decideFactPromotion(candidate, {
    validation: validateFactPromotion(candidate, facts),
    duplicateResult,
    sourceType: "LAW",
    graphContext: {
      relatedFactCount: 0,
      compatibleRelationCount: 0,
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
  pdfPath: string;
  qualityResult: ReturnType<typeof extractPdfWithQuality>;
  beforeQuality: ReturnType<typeof qualitySummary>;
  afterQuality: ReturnType<typeof qualitySummary>;
  beforeCandidateCount: number;
  afterCandidateCount: number;
  normalizedSample: string;
}) {
  const score = input.qualityResult.extractionQualityScore;
  return [
    "# PDF Extraction Quality Report",
    "",
    "## 기존 문제",
    "",
    "- Legal Reconstruction은 조건/예외 문맥을 크게 개선했지만 PDF extraction 단계에는 한글 깨짐, 표 손실, 별표 구조 손실, 숫자/단위 분리 문제가 남아 있었다.",
    "- 이번 레이어는 PDF 원문을 저장하거나 Pack에 반영하지 않고, Text/Structure 품질 측정과 정규화 결과만 만든다.",
    "",
    "## 개선 방법",
    "",
    "- Text Normalizer: UTF-8 unicode normalization, 제어문자 제거, 줄바꿈 정리, 숫자 주변 공백 정리.",
    "- Encoding Detector: replacement character, 비정상 unicode, mojibake-like pattern, affected page를 측정.",
    "- Table Extractor: pipe/whitespace 기반 표 후보를 PdfTable 구조로 변환.",
    "- Legal Table Parser: 별표, 별지, 기준표, 등록요건표, 처벌표 성격을 LegalTableFactCandidate로 분류.",
    "- Number Preservation: value, unit, operator(이상/이하/초과/미만)를 PreservedNumber로 보존.",
    "- Quality Scorer: encoding/structure/table/numeric 각 25% 가중으로 extractionQualityScore를 계산.",
    "",
    "## Before / After",
    "",
    table(["Metric", "Before source adapter", "After quality layer + legal reconstruction"], [
      ["Candidate count", String(input.beforeCandidateCount), String(input.afterCandidateCount)],
      ["Numeric rate", percent(input.beforeQuality.numericRate), percent(input.afterQuality.numericRate)],
      ["Condition rate", percent(input.beforeQuality.conditionRate), percent(input.afterQuality.conditionRate)],
      ["Exception rate", percent(input.beforeQuality.exceptionRate), percent(input.afterQuality.exceptionRate)],
      ["AUTO_APPROVE count", String(input.beforeQuality.autoApproveCount), String(input.afterQuality.autoApproveCount)],
      ["POOR count", String(input.beforeQuality.poorCount), String(input.afterQuality.poorCount)],
      ["False approve risk count", String(input.beforeQuality.falseApproveRiskCount), String(input.afterQuality.falseApproveRiskCount)],
      ["False approve risk rate", percent(input.beforeQuality.falseApproveRiskRate), percent(input.afterQuality.falseApproveRiskRate)]
    ]),
    "",
    "## Extraction Score",
    "",
    `- overallScore: ${score.overallScore.toFixed(3)}`,
    `- encodingScore: ${score.encodingScore.toFixed(3)}`,
    `- structureScore: ${score.structureScore.toFixed(3)}`,
    `- tableScore: ${score.tableScore.toFixed(3)}`,
    `- numericScore: ${score.numericScore.toFixed(3)}`,
    `- warnings: ${input.qualityResult.warnings.map((warning) => `${warning.type}:${warning.severity}`).join(", ") || "none"}`,
    "",
    "## Table 결과",
    "",
    `- extracted tables: ${input.qualityResult.tables.length}`,
    `- legal table cells: ${input.qualityResult.legalTableCandidates.length}`,
    input.qualityResult.tables.length
      ? table(["Table", "Headers", "Rows", "Locator"], input.qualityResult.tables.slice(0, 8).map((item) => [
        item.tableId,
        item.headers.join(", "),
        String(item.rows.length),
        item.sourceLocator
      ]))
      : "- No reliable table structure detected in the first extraction window.",
    "",
    "## 숫자 보존 결과",
    "",
    `- preserved numbers: ${input.qualityResult.preservedNumbers.length}`,
    table(["Raw", "Value", "Unit", "Operator", "Locator"], input.qualityResult.preservedNumbers.slice(0, 20).map((item) => [
      item.raw,
      String(item.value),
      item.unit ?? "-",
      item.operator ?? "-",
      item.sourceLocator ?? "-"
    ])),
    "",
    "## Normalized Text Sample",
    "",
    "```text",
    input.normalizedSample,
    "```",
    "",
    "## 남은 문제",
    "",
    "- PDF extractor가 이미 잘못 디코딩한 텍스트는 정규화만으로 원문 복원이 불가능하다.",
    "- 표가 실제 PDF 내부에서 선/좌표만 있고 텍스트 column alignment가 약하면 table count가 낮게 나온다.",
    "- 별표의 복잡한 다단 표는 향후 pdfplumber table settings 또는 OCR/table-aware extractor가 필요하다.",
    "- 이번 단계는 품질 레이어만 추가했으며 Auto Promotion threshold와 Fact 승격 로직은 변경하지 않았다.",
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
  if (!rows.length) return "_None._";
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map((value) => value.replaceAll("|", "\\|")).join(" | ")} |`)
  ].join("\n");
}

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}
