import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { AtomicFact, Concept, KnowledgeRelation, QuestionTemplate } from "@/domain/exam-engine/types";
import type { ExamCoverageReport } from "@/domain/exam-engine/coverage";
import type { FactCandidate, FactDuplicateResult } from "@/domain/exam-engine/knowledge-ingestion/knowledge-ingestion";
import { DRONE_BASIC_EXAM_BLUEPRINT } from "@/domain/exam-engine/selection/exam-selection";
import { calculateExamCoverage } from "@/domain/exam-engine/coverage";
import { analyzeNewKnowledgeSource } from "@/domain/exam-engine/knowledge-ingestion/knowledge-expansion-pipeline";
import { detectDuplicateFact } from "@/domain/exam-engine/knowledge-ingestion/fact-duplicate-detector";
import { validateFactPromotion } from "@/domain/exam-engine/knowledge-ingestion/fact-promotion-validator";
import { findRelatedExistingFacts } from "@/domain/exam-engine/knowledge-ingestion/related-existing-facts";
import { analyzeKnowledgeGraph } from "@/domain/exam-engine/knowledge-graph/graph-analysis-pipeline";
import { decideFactPromotion } from "@/domain/exam-engine/knowledge-ingestion/auto-promotion";
import type { FactPromotionDecision } from "@/domain/exam-engine/knowledge-ingestion/auto-promotion";
import { analyzeExpansionCandidates, scoreKnowledgeExpansion } from "@/domain/exam-engine/knowledge-ingestion/intelligence";
import type { ExpansionCandidateInput, KnowledgeExpansionScore } from "@/domain/exam-engine/knowledge-ingestion/intelligence";
import { pdfToKnowledgeSourceInput } from "./pdf-source-adapter";

const PDF_PATH = path.join(process.cwd(), "docs", "1. 항공안전법 (1).pdf");
const PACK_EXPORT_PATH = path.join(process.cwd(), "work", "exports", "prod-active-export-20260731-26approved.json");
const REPORT_PATH = path.join(process.cwd(), "docs", "real-source-expansion-report.md");

describe("PDF Source Knowledge Expansion Pipeline", () => {
  it("creates a KnowledgeSourceInput from a PDF while preserving sourceReference", () => {
    const source = pdfToKnowledgeSourceInput(PDF_PATH, {
      sourceId: "pdf-aviation-safety-act",
      sourceType: "LAW",
      title: "항공안전법 PDF",
      version: "real-source-v1",
      maxPages: 20,
      maxCharacters: 24000
    });

    expect(source.sourceType).toBe("LAW");
    expect(source.content.length).toBeGreaterThan(100);
    expect(source.sourceReference.documentId).toBe("pdf-aviation-safety-act");
    expect(source.sourceReference.locator).toContain("PDF:");
  }, 150000);

  it("runs real PDF source through candidate extraction, duplicate detection, auto promotion, expansion intelligence, and coverage simulation", () => {
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
    const candidates = [
      ...expansion.newCandidates,
      ...expansion.reviewCandidates,
      ...expansion.duplicateCandidates
    ].slice(0, 200);
    const duplicateResults = candidates.map((candidate) => detectDuplicateFact(candidate, pack.facts));
    const duplicateCount = duplicateResults.filter((result) => result.isDuplicate).length;
    const graphAnalysis = analyzeKnowledgeGraph(pack.packId, pack.facts);
    const currentCoverage = calculateExamCoverage(pack.facts, pack.approvedFacts, pack.templates, DRONE_BASIC_EXAM_BLUEPRINT, { concepts: pack.concepts });
    const decisions = candidates.map((candidate, index) => decide(candidate, duplicateResults[index], pack.facts, graphAnalysis.validatedRelations));
    const expansionInputs = candidates.map((candidate, index) => expansionInput(candidate, decisions[index], currentCoverage, pack, graphAnalysis.validatedRelations));
    const expansionScores = expansionInputs.map((input) => scoreKnowledgeExpansion(input.candidate, input.context));
    const batch = analyzeExpansionCandidates(expansionInputs, 20);

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((candidate) => candidate.sourceReference.documentId === source.sourceReference.documentId)).toBe(true);
    expect(decisions).toHaveLength(candidates.length);
    expect(expansionScores).toHaveLength(candidates.length);
    expect(batch.topCandidates.length).toBeGreaterThan(0);
    expect(pack.facts).toHaveLength(433);
    expect(pack.approvedFacts).toHaveLength(26);

    fs.writeFileSync(REPORT_PATH, renderReport({
      sourcePath: PDF_PATH,
      source,
      currentCoverage,
      candidates,
      totalCandidates: candidates.length,
      duplicateCount,
      duplicateResults,
      decisions,
      topScores: batch.topCandidates,
      predictedQuestionIncrease: batch.predictedQuestionIncrease,
      predictedCoverageIncrease: batch.predictedCoverageIncrease,
      graphAnalysisRelations: graphAnalysis.validatedRelations.length
    }), "utf8");
    expect(fs.existsSync(REPORT_PATH)).toBe(true);
  }, 150000);
});

function decide(candidate: FactCandidate, duplicateResult: FactDuplicateResult, facts: AtomicFact[], relations: KnowledgeRelation[]) {
  const validation = validateFactPromotion(candidate, facts);
  const relatedFacts = findRelatedExistingFacts(candidate, facts, relations);
  return decideFactPromotion(candidate, {
    validation,
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

function expansionInput(
  candidate: FactCandidate,
  decision: FactPromotionDecision,
  currentCoverage: ExamCoverageReport,
  pack: ReturnType<typeof loadPack>,
  relations: KnowledgeRelation[]
): ExpansionCandidateInput {
  const relatedFacts = findRelatedExistingFacts(candidate, pack.facts, relations);
  return {
    candidate,
    context: {
      currentCoverage,
      questionTemplates: pack.templates,
      existingConceptIds: pack.concepts.map((concept) => concept.id),
      existingCategoryIds: [...new Set(pack.concepts.flatMap((concept) => concept.categoryIds))],
      existingFactSignals: pack.facts.map((fact) => ({
        conceptId: fact.conceptId,
        predicate: fact.predicate,
        value: fact.value,
        sourceDocumentId: fact.sourceReferences[0]?.documentId
      })),
      graphContext: {
        relatedFactCount: relatedFacts.length,
        confusedWithPossible: candidate.extractedNumbers.length > 0,
        comparisonPairPossible: candidate.extractedNumbers.length > 0,
        prerequisitePossible: candidate.extractedConditions.length > 0,
        resolvesIsolatedFact: false
      },
      qualityScore: decision.score,
      autoPromotionDecision: decision
    }
  };
}

function loadPack() {
  const raw = JSON.parse(fs.readFileSync(PACK_EXPORT_PATH, "utf8"));
  const pack = raw.pack?.pack ?? raw.pack ?? raw;
  const facts = pack.atomicFacts as AtomicFact[];
  return {
    packId: raw.pack?.id ?? pack.id ?? "kr-drone-license:mrm0omvd",
    facts,
    approvedFacts: facts.filter((fact) => fact.status === "approved"),
    concepts: pack.concepts as Concept[],
    templates: pack.questionTemplates as QuestionTemplate[]
  };
}

function renderReport(input: {
  sourcePath: string;
  source: ReturnType<typeof pdfToKnowledgeSourceInput>;
  currentCoverage: ExamCoverageReport;
  candidates: FactCandidate[];
  totalCandidates: number;
  duplicateCount: number;
  duplicateResults: FactDuplicateResult[];
  decisions: FactPromotionDecision[];
  topScores: KnowledgeExpansionScore[];
  predictedQuestionIncrease: number;
  predictedCoverageIncrease: number;
  graphAnalysisRelations: number;
}) {
  const auto = input.decisions.filter((decision) => decision.decision === "AUTO_APPROVE_CANDIDATE");
  const review = input.decisions.filter((decision) => decision.decision === "REVIEW_REQUIRED");
  const rejected = input.decisions.filter((decision) => decision.decision === "REJECT_CANDIDATE");
  const averageConfidence = average(input.decisions.map((decision) => decision.confidence));
  const duplicateDistribution = distribution(input.duplicateResults.map((result) => bucket(result.confidence)));
  return [
    "# Real Source Expansion Report",
    "",
    "## A. Source 정보",
    "",
    `- PDF name: ${path.basename(input.sourcePath)}`,
    `- PDF path: ${input.sourcePath}`,
    `- sourceId: ${input.source.sourceId}`,
    `- sourceType: ${input.source.sourceType}`,
    `- version: ${input.source.version}`,
    `- content length: ${input.source.content.length}`,
    "",
    "## B. Extraction 결과",
    "",
    `- Candidate count used for simulation: ${input.totalCandidates}`,
    `- Source reference preserved: ${input.source.sourceReference.documentId} / ${input.source.sourceReference.locator}`,
    `- Candidates with extracted numbers: ${input.candidates.filter((candidate) => candidate.extractedNumbers.length > 0).length}`,
    `- Candidates with conditions: ${input.candidates.filter((candidate) => candidate.extractedConditions.length > 0).length}`,
    `- Candidates with exceptions: ${input.candidates.filter((candidate) => candidate.extractedExceptions.length > 0).length}`,
    `- Duplicate candidates: ${input.duplicateCount}`,
    `- New or reviewable candidates: ${input.totalCandidates - input.duplicateCount}`,
    `- Duplicate confidence distribution: ${Object.entries(duplicateDistribution).map(([key, value]) => `${key}=${value}`).join(", ")}`,
    "",
    "### Candidate sample",
    "",
    table(["Candidate", "Statement", "Numbers", "Conditions", "Exceptions"], input.candidates.slice(0, 8).map((candidate) => [
      candidate.candidateId,
      candidate.statement.slice(0, 120),
      candidate.extractedNumbers.join(", ") || "-",
      candidate.extractedConditions.join(", ") || "-",
      candidate.extractedExceptions.join(", ") || "-"
    ])),
    "",
    "## C. Auto Promotion 결과",
    "",
    `- AUTO_APPROVE_CANDIDATE: ${auto.length} (${percent(auto.length, input.totalCandidates)})`,
    `- REVIEW_REQUIRED: ${review.length} (${percent(review.length, input.totalCandidates)})`,
    `- REJECT_CANDIDATE: ${rejected.length} (${percent(rejected.length, input.totalCandidates)})`,
    `- Average confidence: ${averageConfidence.toFixed(3)}`,
    `- Risk distribution: ${riskSummary(input.decisions)}`,
    "",
    "## D. Expansion Intelligence Top 20",
    "",
    table(["Rank", "Candidate", "Score", "Priority", "Quality", "Coverage", "Yield", "Graph", "Novelty"], input.topScores.map((score, index) => [
      String(index + 1),
      score.candidateId,
      score.finalExpansionScore.toFixed(3),
      score.priority,
      score.qualityScore.toFixed(3),
      score.coverageImpactScore.toFixed(3),
      score.examYieldScore.toFixed(3),
      score.graphPotentialScore.toFixed(3),
      score.noveltyScore.toFixed(3)
    ])),
    "",
    "## E. Coverage 변화 Simulation",
    "",
    `- Before approved facts: ${input.currentCoverage.approvedFacts}`,
    `- Before possible questions: ${input.currentCoverage.possibleQuestionCount}/${input.currentCoverage.requiredQuestionCount}`,
    `- Predicted question increase from top candidates: ${input.predictedQuestionIncrease}`,
    `- Predicted coverage increase score: ${input.predictedCoverageIncrease.toFixed(3)}`,
    `- Remaining category gaps before simulation: ${input.currentCoverage.categoryCoverage.filter((entry) => entry.status !== "COVERED").length}`,
    `- Remaining concept gaps before simulation: ${input.currentCoverage.conceptCoverage.filter((entry) => entry.status !== "COVERED").length}`,
    "",
    "## F. Graph/Question 영향",
    "",
    `- Existing validated graph relations used for matching: ${input.graphAnalysisRelations}`,
    `- Candidates with graph-related matching signal: ${input.topScores.filter((score) => score.graphPotentialScore > 0.4).length}`,
    `- Candidates with expected question yield: ${input.topScores.filter((score) => score.examYieldScore > 0).length}`,
    "- Graph impact is simulated only; no relation is created or approved.",
    "- Question yield is predicted only; no GeneratedQuestion is stored.",
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

function table(headers: string[], rows: string[][]) {
  if (!rows.length) return "_None._";
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map((value) => value.replaceAll("|", "\\|")).join(" | ")} |`)
  ].join("\n");
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percent(value: number, total: number) {
  if (!total) return "0.0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

function bucket(value: number) {
  if (value >= 0.9) return "0.90-1.00";
  if (value >= 0.75) return "0.75-0.89";
  if (value >= 0.5) return "0.50-0.74";
  if (value > 0) return "0.01-0.49";
  return "0";
}

function distribution(values: string[]) {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function riskSummary(decisions: FactPromotionDecision[]) {
  const risks = decisions.flatMap((decision) => decision.risks.map((risk) => risk.level));
  const summary = distribution(risks);
  return `LOW ${summary.LOW ?? 0}, MEDIUM ${summary.MEDIUM ?? 0}, HIGH ${summary.HIGH ?? 0}`;
}
