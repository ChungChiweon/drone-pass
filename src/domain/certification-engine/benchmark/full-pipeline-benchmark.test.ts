import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeKnowledgeGraph } from "@/domain/exam-engine/knowledge-graph/graph-analysis-pipeline";
import type { KnowledgePack, KnowledgeRelation } from "@/domain/exam-engine/types";
import { runFullPipelineBenchmark, type FullPipelineBenchmarkResult } from "./full-pipeline-benchmark";

const PACK_ID = "kr-drone-license:mrm0omvd";
const PACK_EXPORT = "work/exports/prod-active-export-20260731-26approved.json";
const PDF_SOURCE = "docs/1. 항공안전법 (1).pdf";
const REPORT = "docs/full-pipeline-benchmark-report.md";
const ACTIVE_RELATION_IDS = [
  "KG-CONFUSED_WITH-AF-223-AF-277",
  "KG-CONFUSED_WITH-AF-224-AF-278",
  "KG-CONFUSED_WITH-AF-224-AF-298",
  "KG-CONFUSED_WITH-AF-224-AF-312",
  "KG-CONFUSED_WITH-AF-277-AF-297",
  "KG-CONFUSED_WITH-AF-278-AF-298",
  "KG-CONFUSED_WITH-AF-278-AF-319",
  "KG-CONFUSED_WITH-AF-297-AF-311",
  "KG-CONFUSED_WITH-AF-298-AF-312",
  "KG-CONFUSED_WITH-AF-298-AF-319",
  "KG-CONFUSED_WITH-AF-312-AF-319"
];

type ExportWrapper = {
  pack: {
    id: string;
    pack: KnowledgePack;
  };
};

describe("Full Pipeline Benchmark", () => {
  it("runs source-to-question benchmark on the real Drone Pack without mutating data", () => {
    const pack = loadPack();
    const before = JSON.stringify({
      facts: pack.atomicFacts.map((fact) => ({ id: fact.id, status: fact.status, statement: fact.statement })),
      templates: pack.questionTemplates.length,
      distractorRules: pack.distractorRules.length
    });
    const activeRelations = activeGraphRelations(pack);
    const result = runFullPipelineBenchmark({
      packId: PACK_ID,
      pack,
      pdfPath: join(process.cwd(), PDF_SOURCE),
      activeRelations,
      approvedFactTargetCount: 40,
      examSize: 40
    });

    writeFileSync(join(process.cwd(), REPORT), renderReport(result), "utf8");

    expect(JSON.stringify({
      facts: pack.atomicFacts.map((fact) => ({ id: fact.id, status: fact.status, statement: fact.statement })),
      templates: pack.questionTemplates.length,
      distractorRules: pack.distractorRules.length
    })).toBe(before);
    expect(pack.atomicFacts).toHaveLength(433);
    expect(pack.atomicFacts.filter((fact) => fact.status === "approved")).toHaveLength(26);
    expect(result.packId).toBe(PACK_ID);
    expect(result.graph.activeRelationCount).toBe(11);
    expect(result.questions.classicGenerated).toBeGreaterThan(0);
    expect(result.decisions.length).toBeGreaterThan(0);
  }, 120_000);
});

function loadPack() {
  const parsed = JSON.parse(readFileSync(join(process.cwd(), PACK_EXPORT), "utf8")) as ExportWrapper;
  return parsed.pack.pack;
}

function activeGraphRelations(pack: KnowledgePack): KnowledgeRelation[] {
  const graph = analyzeKnowledgeGraph(PACK_ID, pack.atomicFacts);
  return ACTIVE_RELATION_IDS.flatMap((relationId) => {
    const relation = graph.validatedRelations.find((item) => item.id === relationId);
    return relation ? [{ ...relation, reviewStatus: "approved" as const }] : [];
  });
}

function renderReport(result: FullPipelineBenchmarkResult) {
  return [
    "# Full Pipeline Benchmark Report",
    "",
    "## 1. Input Source",
    "",
    table(["Field", "Value"], [
      ["Pack ID", result.packId],
      ["PDF", result.inputSource.pdfPath],
      ["PDF exists", String(result.inputSource.exists)],
      ["Source ID", result.inputSource.sourceId ?? "-"],
      ["Title", result.inputSource.title ?? "-"]
    ]),
    "",
    "## 2. Extraction Results",
    "",
    table(["Metric", "Value"], [
      ["Pages processed", String(result.extraction.pagesProcessed)],
      ["Extraction quality", fixed(result.extraction.extractionQualityScore)],
      ["Encoding score", fixed(result.extraction.encodingScore)],
      ["Table count", String(result.extraction.tableCount)],
      ["Numeric preservation", fixed(result.extraction.numericPreservation)],
      ["Warnings", String(result.extraction.warningCount)]
    ]),
    "",
    "## 3. Candidate Results",
    "",
    table(["Metric", "Value"], [
      ["General extraction candidates", String(result.candidates.generalExtraction)],
      ["Legal reconstruction candidates", String(result.candidates.legalReconstruction)],
      ["Table intelligence candidates", String(result.candidates.tableIntelligence)],
      ["Total candidates", String(result.candidates.totalCandidates)],
      ["Duplicate candidates", String(result.candidates.duplicateCandidates)],
      ["Review candidates", String(result.candidates.reviewCandidates)],
      ["Promotion candidates", String(result.candidates.promotionCandidates)]
    ]),
    "",
    "## 4. Promotion Results",
    "",
    table(["Decision", "Count"], [
      ["AUTO_PROMOTION_ELIGIBLE", String(result.promotion.autoPromotionEligible)],
      ["REVIEW_REQUIRED", String(result.promotion.reviewRequired)],
      ["REJECT", String(result.promotion.rejected)]
    ]),
    "",
    "### Top Promotion / Expansion Candidates",
    "",
    table(["Candidate", "Decision", "Promotion Score", "Expansion Score"], result.promotion.topCandidates.map((candidate) => [
      candidate.candidateId,
      candidate.decision,
      fixed(candidate.score),
      fixed(candidate.expansionScore)
    ])),
    "",
    "## 5. Coverage Change",
    "",
    table(["Metric", "Before", "After Simulation"], [
      ["Possible questions", String(result.coverage.beforePossibleQuestionCount), String(result.coverage.afterEstimatedQuestionCount)],
      ["Covered categories", String(result.coverage.categoryCoveredBefore), String(result.coverage.categoryCoveredAfterEstimate)],
      ["Covered concepts", String(result.coverage.conceptCoveredBefore), String(result.coverage.conceptCoveredAfterEstimate)],
      ["40-question exam possible", String(result.coverage.canBuild40Before), String(result.coverage.canBuild40AfterEstimate)]
    ]),
    "",
    "## 6. Graph Change",
    "",
    table(["Metric", "Value"], [
      ["Active relations", String(result.graph.activeRelationCount)],
      ["Simulation RELATED", String(result.graph.simulationRelated)],
      ["Simulation COMPARISON_PAIR", String(result.graph.simulationComparisonPair)],
      ["Simulation CONFUSED_WITH", String(result.graph.simulationConfusedWith)],
      ["Simulation EXCEPTION", String(result.graph.simulationException)],
      ["Expected relations", String(result.graph.expectedRelations)],
      ["Graph density", fixed(result.graph.graphDensity)],
      ["Isolated reduction estimate", String(result.graph.isolatedReductionEstimate)]
    ]),
    "",
    "## 7. Question Change",
    "",
    table(["Metric", "Value"], [
      ["Classic generated", String(result.questions.classicGenerated)],
      ["Graph-aware generated", String(result.questions.graphAwareGenerated)],
      ["Simulation estimated generated", String(result.questions.simulationEstimatedGenerated)],
      ["Classic avg quality", fixed(result.questions.classicAverageQuality)],
      ["Graph-aware avg quality", fixed(result.questions.graphAwareAverageQuality)],
      ["Graph usage score", fixed(result.questions.graphUsageScore)],
      ["Graph-backed distractors", String(result.questions.graphBackedDistractors)],
      ["Category balance score", fixed(result.questions.categoryBalanceScore)],
      ["Difficulty balance score", fixed(result.questions.difficultyBalanceScore)]
    ]),
    "",
    "## 8. 40-Question Exam Feasibility",
    "",
    `**${result.examBlueprint.possible}**`,
    "",
    `- Exam size: ${result.examBlueprint.examSize}`,
    `- Missing categories: ${result.examBlueprint.missingCategories.join(", ") || "-"}`,
    `- Missing concepts sample: ${result.examBlueprint.missingConcepts.join(", ") || "-"}`,
    `- Missing fact/template types: ${result.examBlueprint.missingFactTypes.join(", ") || "-"}`,
    "",
    "## 9. Decision Support",
    "",
    table(["Type", "Priority", "Reason"], result.decisions.map((decision) => [
      decision.type,
      decision.priority,
      decision.reason
    ])),
    "",
    "## 10. Bottlenecks",
    "",
    result.bottlenecks.map((item) => `- ${item}`).join("\n") || "- No critical bottleneck detected.",
    "",
    "## 11. Safety",
    "",
    "- No AtomicFact mutation.",
    "- No Fact status change.",
    "- No KnowledgePack write.",
    "- No Graph relation or Graph Version change.",
    "- No Question DB write.",
    "- No Supabase change.",
    ""
  ].join("\n");
}

function table(headers: string[], rows: string[][]) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`)
  ].join("\n");
}

function fixed(value: number) {
  return value.toFixed(3);
}
