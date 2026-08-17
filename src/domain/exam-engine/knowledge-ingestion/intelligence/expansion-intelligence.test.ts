import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { FactCandidate } from "@/domain/exam-engine/knowledge-ingestion/knowledge-ingestion";
import type { QuestionTemplate } from "@/domain/exam-engine/types";
import type { ExamCoverageReport } from "@/domain/exam-engine/coverage";
import { decideFactPromotion } from "@/domain/exam-engine/knowledge-ingestion/auto-promotion";
import { scoreKnowledgeExpansion } from "./expansion-intelligence-engine";
import { analyzeExpansionCandidates } from "./batch-expansion-analyzer";
import type { ExpansionCandidateInput, KnowledgeExpansionScoringContext } from "./expansion-intelligence";

const REPORT_PATH = path.join(process.cwd(), "docs", "knowledge-expansion-intelligence-report.md");

describe("Knowledge Expansion Intelligence Layer", () => {
  it("raises score for a candidate that opens a new category", () => {
    const score = scoreKnowledgeExpansion(candidate({ candidateId: "FC-NEW", categoryHint: "cat-new", conceptHint: "C-NEW" }), context());

    expect(score.coverageImpactScore).toBeGreaterThan(0.2);
    expect(score.finalExpansionScore).toBeGreaterThan(0.6);
  });

  it("lowers novelty for duplicate-like candidates", () => {
    const duplicateLike = scoreKnowledgeExpansion(candidate({ conceptHint: "C-EXISTING", statement: "기존 기준은 25kg 이상이다" }), context({
      existingFactSignals: [{ conceptId: "C-EXISTING", value: 25, sourceDocumentId: "doc-law" }]
    }));
    const novel = scoreKnowledgeExpansion(candidate({ conceptHint: "C-NEW", categoryHint: "cat-new", extractedNumbers: ["150"], statement: "새로운 사업 기준은 150kg 이상이다" }), context());

    expect(duplicateLike.noveltyScore).toBeLessThan(novel.noveltyScore);
  });

  it("raises question yield for numeric and exception candidates", () => {
    const plain = scoreKnowledgeExpansion(candidate({ extractedNumbers: [], extractedExceptions: [], extractedConditions: [], statement: "신고 대상이다" }), context());
    const rich = scoreKnowledgeExpansion(candidate({ extractedNumbers: ["150"], extractedExceptions: ["예외"], extractedConditions: ["사업자"], statement: "사업자는 150kg 기준의 예외를 확인한다" }), context());

    expect(rich.examYieldScore).toBeGreaterThan(plain.examYieldScore);
  });

  it("raises graph potential for connectable candidates", () => {
    const weak = scoreKnowledgeExpansion(candidate(), context({ graphContext: { relatedFactCount: 0 } }));
    const connected = scoreKnowledgeExpansion(candidate(), context({ graphContext: { relatedFactCount: 4, confusedWithPossible: true, comparisonPairPossible: true } }));

    expect(connected.graphPotentialScore).toBeGreaterThan(weak.graphPotentialScore);
  });

  it("connects expansion score to auto promotion as an advisory reason only", () => {
    const expansion = scoreKnowledgeExpansion(candidate(), context());
    const decision = decideFactPromotion(candidate(), {
      validation: { valid: true, warnings: [], errors: [] },
      duplicateResult: { isDuplicate: false, matchedFactIds: [], confidence: 0, reasons: [] },
      sourceType: "LAW",
      graphContext: { relatedFactCount: 3, compatibleRelationCount: 2, examValueScore: 0.8 },
      expansionScore: expansion.finalExpansionScore
    });

    expect(decision.reasons.some((reason) => reason.includes("expansion"))).toBe(true);
    expect(decision.decision).toBe("AUTO_APPROVE_CANDIDATE");
  });

  it("ranks batch candidates and writes the simulation report", () => {
    const inputs: ExpansionCandidateInput[] = [
      { candidate: candidate({ candidateId: "FC-A", categoryHint: "cat-new", conceptHint: "C-NEW", extractedNumbers: ["25"] }), context: context({ qualityScore: 0.95, graphContext: { relatedFactCount: 4, confusedWithPossible: true, comparisonPairPossible: true } }) },
      { candidate: candidate({ candidateId: "FC-B", conceptHint: "C-EXISTING", categoryHint: "cat-existing", extractedNumbers: [], statement: "기존 기준과 유사하다" }), context: context({ qualityScore: 0.92, existingFactSignals: [{ conceptId: "C-EXISTING", sourceDocumentId: "doc-law" }] }) },
      { candidate: candidate({ candidateId: "FC-C", categoryHint: "cat-gap", conceptHint: "C-GAP", extractedConditions: ["조건"], extractedExceptions: ["예외"] }), context: context({ qualityScore: 0.88, graphContext: { relatedFactCount: 2, prerequisitePossible: true } }) },
      { candidate: candidate({ candidateId: "FC-D", confidence: 0.45, extractedNumbers: [] }), context: context({ qualityScore: 0.45, graphContext: { relatedFactCount: 0 } }) }
    ];
    const report = analyzeExpansionCandidates(inputs, 3);

    expect(report.totalCandidates).toBe(4);
    expect(report.topCandidates).toHaveLength(3);
    expect(report.topCandidates[0].finalExpansionScore).toBeGreaterThanOrEqual(report.topCandidates[1].finalExpansionScore);
    expect(report.predictedQuestionIncrease).toBeGreaterThan(0);

    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, renderReport(report), "utf8");
    expect(fs.existsSync(REPORT_PATH)).toBe(true);
  });
});

function candidate(overrides: Partial<FactCandidate> = {}): FactCandidate {
  return {
    candidateId: "FC-001",
    sourceId: "source-law",
    statement: "항공사업법 시행령 별표 8에 따른 사업 기준은 25kg 이상이다",
    conceptHint: "C-GAP",
    categoryHint: "cat-gap",
    extractedNumbers: ["25"],
    extractedConditions: ["사업 기준"],
    extractedExceptions: [],
    confidence: 0.9,
    sourceReference: { documentId: "doc-law", locator: "별표 8" },
    status: "review_candidate",
    ...overrides
  };
}

function context(overrides: Partial<KnowledgeExpansionScoringContext> = {}): KnowledgeExpansionScoringContext {
  return {
    currentCoverage: coverage(),
    questionTemplates: templates(),
    existingConceptIds: ["C-EXISTING"],
    existingCategoryIds: ["cat-existing"],
    existingFactSignals: [],
    graphContext: { relatedFactCount: 2, confusedWithPossible: true, comparisonPairPossible: true },
    qualityScore: 0.9,
    ...overrides
  };
}

function coverage(): ExamCoverageReport {
  return {
    totalFacts: 433,
    approvedFacts: 26,
    requiredQuestionCount: 40,
    possibleQuestionCount: 26,
    categoryCoverage: [{ id: "cat-existing", label: "existing", totalCount: 10, approvedCount: 3, possibleQuestionCount: 3, requiredCount: 1, ratio: 1, status: "COVERED" }],
    conceptCoverage: [{ id: "C-EXISTING", label: "existing", totalCount: 10, approvedCount: 3, possibleQuestionCount: 3, requiredCount: 1, ratio: 1, status: "COVERED" }],
    difficultyCoverage: [
      { id: "easy", label: "easy", totalCount: 26, approvedCount: 12, possibleQuestionCount: 12, requiredCount: 12, ratio: 1, status: "COVERED" },
      { id: "medium", label: "medium", totalCount: 26, approvedCount: 14, possibleQuestionCount: 14, requiredCount: 20, ratio: 0.7, status: "PARTIAL" },
      { id: "hard", label: "hard", totalCount: 26, approvedCount: 3, possibleQuestionCount: 3, requiredCount: 8, ratio: 0.375, status: "PARTIAL" }
    ],
    templateCoverage: [
      { id: "SELECT_TRUE", label: "SELECT_TRUE", totalCount: 26, approvedCount: 26, possibleQuestionCount: 26, requiredCount: 1, ratio: 1, status: "COVERED" },
      { id: "NUMERIC_THRESHOLD", label: "NUMERIC_THRESHOLD", totalCount: 26, approvedCount: 4, possibleQuestionCount: 4, requiredCount: 1, ratio: 1, status: "COVERED" },
      { id: "CASE_JUDGMENT", label: "CASE_JUDGMENT", totalCount: 26, approvedCount: 0, possibleQuestionCount: 0, requiredCount: 1, ratio: 0, status: "MISSING" }
    ],
    missingCoverage: [
      { gapType: "CATEGORY", targetId: "cat-gap", currentCount: 0, requiredCount: 1, priority: "HIGH", priorityScore: 0.9, reason: "category missing" },
      { gapType: "CONCEPT", targetId: "C-GAP", currentCount: 0, requiredCount: 1, priority: "MEDIUM", priorityScore: 0.65, reason: "concept missing" },
      { gapType: "TEMPLATE", targetId: "CASE_JUDGMENT", currentCount: 0, requiredCount: 1, priority: "HIGH", priorityScore: 0.8, reason: "case missing" },
      { gapType: "DIFFICULTY", targetId: "hard", currentCount: 3, requiredCount: 8, priority: "MEDIUM", priorityScore: 0.5, reason: "hard partial" }
    ]
  };
}

function templates(): QuestionTemplate[] {
  return [
    { id: "QT-T", questionType: "SELECT_TRUE", difficulty: "easy", stemTemplate: "", explanationTemplate: "" },
    { id: "QT-F", questionType: "SELECT_FALSE", difficulty: "medium", stemTemplate: "", explanationTemplate: "" },
    { id: "QT-N", questionType: "NUMERIC_THRESHOLD", difficulty: "easy", stemTemplate: "", explanationTemplate: "" },
    { id: "QT-C", questionType: "CONCEPT_COMPARISON", difficulty: "medium", stemTemplate: "", explanationTemplate: "" },
    { id: "QT-J", questionType: "CASE_JUDGMENT", difficulty: "hard", stemTemplate: "", explanationTemplate: "" }
  ];
}

function renderReport(report: ReturnType<typeof analyzeExpansionCandidates>) {
  return [
    "# Knowledge Expansion Intelligence Report",
    "",
    "## Score Structure",
    "",
    "- qualityScore: 30%",
    "- coverageImpactScore: 30%",
    "- examYieldScore: 20%",
    "- graphPotentialScore: 10%",
    "- noveltyScore: 10%",
    "",
    "## Simulation Result",
    "",
    `- Total candidates: ${report.totalCandidates}`,
    `- Average expansion score: ${report.averageScore}`,
    `- Predicted question increase: ${report.predictedQuestionIncrease}`,
    `- Predicted coverage increase: ${report.predictedCoverageIncrease.toFixed(3)}`,
    `- Priority distribution: CRITICAL ${report.priorityDistribution.CRITICAL}, HIGH ${report.priorityDistribution.HIGH}, MEDIUM ${report.priorityDistribution.MEDIUM}, LOW ${report.priorityDistribution.LOW}`,
    `- High quality + high expansion: ${report.autoPromotionSummary?.highQualityHighExpansion ?? 0}`,
    `- High quality + low expansion: ${report.autoPromotionSummary?.highQualityLowExpansion ?? 0}`,
    "",
    "## Top Expansion Candidates",
    "",
    table(["Rank", "Candidate", "Score", "Priority", "Quality", "Coverage", "Yield", "Graph", "Novelty"], report.topCandidates.map((score, index) => [
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
    "## Difference from Auto Promotion",
    "",
    "- Auto Promotion answers whether a candidate is safe enough to classify as an approval candidate.",
    "- Expansion Intelligence answers whether that candidate materially improves exam coverage, graph utility, and question yield.",
    "- The Auto Promotion threshold is not changed; expansionScore is advisory only.",
    "",
    "## Data Safety",
    "",
    "- No AtomicFact creation, Fact status update, KnowledgePack mutation, graph mutation, Question DB write, or Supabase write is performed."
  ].join("\n") + "\n";
}

function table(headers: string[], rows: string[][]) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`)
  ].join("\n");
}
