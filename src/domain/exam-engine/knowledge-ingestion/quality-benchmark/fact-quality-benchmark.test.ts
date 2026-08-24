import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { AtomicFact, Concept, KnowledgeRelation } from "@/domain/exam-engine/types";
import type { FactCandidate } from "@/domain/exam-engine/knowledge-ingestion/knowledge-ingestion";
import { analyzeNewKnowledgeSource } from "@/domain/exam-engine/knowledge-ingestion/knowledge-expansion-pipeline";
import { detectDuplicateFact } from "@/domain/exam-engine/knowledge-ingestion/fact-duplicate-detector";
import { validateFactPromotion } from "@/domain/exam-engine/knowledge-ingestion/fact-promotion-validator";
import { findRelatedExistingFacts } from "@/domain/exam-engine/knowledge-ingestion/related-existing-facts";
import { analyzeKnowledgeGraph } from "@/domain/exam-engine/knowledge-graph/graph-analysis-pipeline";
import { decideFactPromotion } from "@/domain/exam-engine/knowledge-ingestion/auto-promotion";
import type { FactPromotionDecision } from "@/domain/exam-engine/knowledge-ingestion/auto-promotion";
import { pdfToKnowledgeSourceInput } from "@/domain/exam-engine/knowledge-ingestion/source/pdf-source-adapter";
import { analyzeFactQualitySamples, benchmarkFactQuality, recommendThreshold, simulatePromotionThresholds, validateAutoApproveCandidate } from "./index";
import type { FactQualityBenchmarkInput, FactQualityBenchmarkResult } from "./fact-quality-benchmark";

const PDF_PATH = path.join(process.cwd(), "docs", "1. 항공안전법 (1).pdf");
const PACK_EXPORT_PATH = path.join(process.cwd(), "work", "exports", "prod-active-export-20260731-26approved.json");
const REPORT_PATH = path.join(process.cwd(), "docs", "fact-quality-benchmark-report.md");

describe("Fact Quality Benchmark", () => {
  it("validates source, statement, numeric, legal, and duplicate signals", () => {
    const validation = validateAutoApproveCandidate(candidate(), { isDuplicate: false, matchedFactIds: [], confidence: 0, reasons: [] }, "LAW");

    expect(validation.validationSignals.sourceValid).toBe(true);
    expect(validation.validationSignals.numericConsistent).toBe(true);
    expect(validation.score).toBeGreaterThan(0.7);
  });

  it("reclassifies risky candidates and simulates thresholds", () => {
    const highQuality = input(candidate({ candidateId: "FC-A" }), decision("FC-A", 0.95));
    const weak = input(candidate({ candidateId: "FC-B", statement: "25kg", sourceReference: { documentId: "", locator: "" } }), decision("FC-B", 0.91));
    const samples = [highQuality, weak].map(benchmarkFactQuality);
    const thresholds = simulatePromotionThresholds([highQuality, weak], [0.95, 0.92, 0.9, 0.85]);

    expect(samples.some((sample) => sample.riskLevel === "HIGH" || sample.riskLevel === "CRITICAL")).toBe(true);
    expect(thresholds.find((item) => item.threshold === 0.95)?.autoApproveCount).toBe(1);
  });

  it("benchmarks the real PDF candidate set and writes the report", () => {
    const pack = loadPack();
    const source = pdfToKnowledgeSourceInput(PDF_PATH, {
      sourceId: "pdf-aviation-safety-act",
      sourceType: "LAW",
      title: "항공안전법 PDF",
      version: "real-source-v1",
      maxPages: 20,
      maxCharacters: 24000
    });
    const expansion = analyzeNewKnowledgeSource(source, pack.facts);
    const candidates = [...expansion.newCandidates, ...expansion.reviewCandidates, ...expansion.duplicateCandidates].slice(0, 200);
    const graph = analyzeKnowledgeGraph(pack.packId, pack.facts);
    const inputs = candidates.map((candidate) => realInput(candidate, pack.facts, graph.validatedRelations));
    const results = inputs.map(benchmarkFactQuality);
    const autoResults = results.filter((result) => result.promotionDecision === "AUTO_APPROVE_CANDIDATE");
    const reviewResults = results.filter((result) => result.promotionDecision === "REVIEW_REQUIRED");
    const sampleReports = analyzeFactQualitySamples(inputs, 30);
    const thresholds = simulatePromotionThresholds(inputs);
    const recommendedThreshold = recommendThreshold(thresholds);

    expect(candidates).toHaveLength(200);
    expect(autoResults.length).toBeGreaterThan(0);
    expect(autoResults.length + reviewResults.length).toBe(200);
    expect(sampleReports.length).toBeGreaterThanOrEqual(2);
    expect(thresholds).toHaveLength(4);

    fs.writeFileSync(REPORT_PATH, renderReport({
      sourcePath: PDF_PATH,
      totalCandidates: candidates.length,
      autoResults,
      reviewResults,
      sampleReports,
      thresholds,
      recommendedThreshold
    }), "utf8");
    expect(fs.existsSync(REPORT_PATH)).toBe(true);
  }, 150000);
});

function realInput(candidate: FactCandidate, facts: AtomicFact[], relations: KnowledgeRelation[]): FactQualityBenchmarkInput {
  const duplicateResult = detectDuplicateFact(candidate, facts);
  const relatedFacts = findRelatedExistingFacts(candidate, facts, relations);
  const promotionDecision = decideFactPromotion(candidate, {
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
  return { candidate, promotionDecision, duplicateResult, sourceType: "LAW" };
}

function input(candidate: FactCandidate, promotionDecision: FactPromotionDecision): FactQualityBenchmarkInput {
  return {
    candidate,
    promotionDecision,
    duplicateResult: { isDuplicate: false, matchedFactIds: [], confidence: 0, reasons: [] },
    sourceType: "LAW"
  };
}

function candidate(overrides: Partial<FactCandidate> = {}): FactCandidate {
  return {
    candidateId: "FC-001",
    sourceId: "pdf-source",
    statement: "항공안전법 제125조에 따라 초경량비행장치 조종자는 25kg 이상 기준을 확인하여야 한다",
    conceptHint: "concept:qualification",
    categoryHint: "cat-pilot-certificate-target",
    extractedNumbers: ["25kg"],
    extractedConditions: ["따른", "이상", "하여야"],
    extractedExceptions: [],
    confidence: 0.95,
    sourceReference: { documentId: "pdf-aviation-safety-act", locator: "PDF:항공안전법" },
    status: "review_candidate",
    ...overrides
  };
}

function decision(candidateId: string, score: number): FactPromotionDecision {
  return {
    candidateId,
    decision: score >= 0.9 ? "AUTO_APPROVE_CANDIDATE" : "REVIEW_REQUIRED",
    confidence: score,
    score,
    reasons: [],
    risks: [],
    signals: {
      sourceConfidence: score,
      duplicateScore: 0,
      contradictionScore: 0,
      legalReferenceScore: 1,
      numericConsistencyScore: 1,
      graphCompatibilityScore: 0.5,
      examValueScore: score
    },
    requiresHumanReview: score < 0.9
  };
}

function loadPack() {
  const raw = JSON.parse(fs.readFileSync(PACK_EXPORT_PATH, "utf8"));
  const pack = raw.pack?.pack ?? raw.pack ?? raw;
  const facts = pack.atomicFacts as AtomicFact[];
  return {
    packId: raw.pack?.id ?? pack.id ?? "kr-drone-license:mrm0omvd",
    facts,
    concepts: pack.concepts as Concept[]
  };
}

function renderReport(input: {
  sourcePath: string;
  totalCandidates: number;
  autoResults: FactQualityBenchmarkResult[];
  reviewResults: FactQualityBenchmarkResult[];
  sampleReports: ReturnType<typeof analyzeFactQualitySamples>;
  thresholds: ReturnType<typeof simulatePromotionThresholds>;
  recommendedThreshold: number;
}) {
  const autoGrades = gradeDistribution(input.autoResults);
  const reviewGrades = gradeDistribution(input.reviewResults);
  const falseApproveRisk = input.autoResults.filter((result) => result.riskLevel === "HIGH" || result.riskLevel === "CRITICAL").length;
  return [
    "# Fact Quality Benchmark Report",
    "",
    "## Source",
    "",
    `- PDF: ${input.sourcePath}`,
    `- Candidate total: ${input.totalCandidates}`,
    "",
    "## AUTO_APPROVE Quality",
    "",
    `- AUTO_APPROVE count: ${input.autoResults.length}`,
    `- EXCELLENT: ${autoGrades.EXCELLENT}`,
    `- GOOD: ${autoGrades.GOOD}`,
    `- ACCEPTABLE: ${autoGrades.ACCEPTABLE}`,
    `- POOR: ${autoGrades.POOR}`,
    `- False approve risk count: ${falseApproveRisk}`,
    `- False approve risk rate: ${percent(falseApproveRisk, input.autoResults.length)}`,
    "",
    "## REVIEW_REQUIRED Quality",
    "",
    `- REVIEW_REQUIRED count: ${input.reviewResults.length}`,
    `- EXCELLENT: ${reviewGrades.EXCELLENT}`,
    `- GOOD: ${reviewGrades.GOOD}`,
    `- ACCEPTABLE: ${reviewGrades.ACCEPTABLE}`,
    `- POOR: ${reviewGrades.POOR}`,
    "",
    "## Sample Analysis",
    "",
    table(["Group", "Sample", "Pass Rate", "Issue Rate", "False Approve Risk"], input.sampleReports.map((report) => [
      report.group,
      String(report.sampleSize),
      report.passRate.toFixed(3),
      report.issueRate.toFixed(3),
      report.falseApproveRiskRate.toFixed(3)
    ])),
    "",
    "## Threshold Simulation",
    "",
    table(["Threshold", "Auto Approve", "Review", "Estimated Risk", "Risk Rate"], input.thresholds.map((threshold) => [
      threshold.threshold.toFixed(2),
      String(threshold.autoApproveCount),
      String(threshold.reviewCount),
      String(threshold.estimatedRiskCount),
      threshold.estimatedRiskRate.toFixed(3)
    ])),
    "",
    `## Recommended Threshold: ${input.recommendedThreshold.toFixed(2)}`,
    "",
    "- Recommendation is analytical only. Auto Promotion threshold was not changed.",
    "- Main improvement: require post-promotion quality validator before trusting AUTO_APPROVE candidates.",
    "",
    "## Data Safety",
    "",
    "- AtomicFact creation: not performed.",
    "- Fact status changes: not performed.",
    "- KnowledgePack mutation: not performed.",
    "- Graph/Graph Version changes: not performed.",
    "- Question DB writes: not performed.",
    "- Supabase writes: not performed."
  ].join("\n") + "\n";
}

function gradeDistribution(results: FactQualityBenchmarkResult[]) {
  return {
    EXCELLENT: results.filter((result) => result.qualityGrade === "EXCELLENT").length,
    GOOD: results.filter((result) => result.qualityGrade === "GOOD").length,
    ACCEPTABLE: results.filter((result) => result.qualityGrade === "ACCEPTABLE").length,
    POOR: results.filter((result) => result.qualityGrade === "POOR").length
  };
}

function table(headers: string[], rows: string[][]) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`)
  ].join("\n");
}

function percent(value: number, total: number) {
  if (!total) return "0.0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}
