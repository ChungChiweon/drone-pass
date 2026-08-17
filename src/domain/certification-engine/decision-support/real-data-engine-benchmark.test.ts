import { describe, expect, it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { compileQuestion, isTemplateSuitableForFact } from "@/domain/exam-engine/compiler/question-compiler";
import { scoreQuestionQuality } from "@/domain/exam-engine/evaluation/question-quality-scorer";
import { generateGraphAwareQuestion } from "@/domain/exam-engine/generation/graph-aware-question-generator";
import { buildQuestionGenerationContext } from "@/domain/exam-engine/generation/question-generation-context-builder";
import { analyzeKnowledgeGraph } from "@/domain/exam-engine/knowledge-graph/graph-analysis-pipeline";
import { curateRelations } from "@/domain/exam-engine/knowledge-graph/relation-curation-pipeline";
import { scoreFactsForExam } from "@/domain/exam-engine/knowledge-graph/exam-value-scorer";
import { DRONE_BASIC_EXAM_BLUEPRINT } from "@/domain/exam-engine/selection/exam-selection";
import { selectExamQuestions } from "@/domain/exam-engine/selection/exam-selection-engine";
import type { AtomicFact, Concept, DistractorRule, GeneratedQuestion, KnowledgePack, KnowledgeRelation, QuestionTemplate } from "@/domain/exam-engine/types";
import { generateDecisionRecommendations } from "./decision-support-engine";
import type { DecisionRecommendation, DecisionSupportContext } from "./decision-support";

const PACK_EXPORT = "work/prod-active-export-latest-20260727-17approved.json";
const BENCHMARK_DOC = "docs/real-data-engine-benchmark.md";
const PACK_ID = "kr-drone-license:mrm0omvd";
const BEFORE_GRAPH_STATS = {
  generatedRelations: 3677,
  validatedRelations: 3518,
  approvedCandidates: 162,
  reviewCandidates: 2403,
  isolatedFacts: 1,
  relationSummary: {
    RELATED: 461,
    CONFUSED_WITH: 664,
    CONTRASTS_WITH: 658,
    PREREQUISITE_FOR: 0,
    EXCEPTION_OF: 0,
    DERIVED_FROM: 81,
    SAME_CONCEPT: 1101,
    COMPARISON_PAIR: 553,
    APPLIES_TO: 0
  } satisfies Record<KnowledgeRelation["relationType"], number>
};

const SAMPLE_QA_TYPES = ["CONFUSED_WITH", "CONTRASTS_WITH", "COMPARISON_PAIR", "SAME_CONCEPT"] as const;

type ExportWrapper = {
  pack: {
    id: string;
    pack: KnowledgePack;
  };
};

type ApprovedFactBenchmark = {
  factId: string;
  examValue: number;
  suitableTemplates: string[];
  graphRelationCandidates: number;
  distractorCandidateCount: number;
  classicGenerated: GeneratedQuestion | null;
  graphGenerated: GeneratedQuestion | null;
  simulationGraphGenerated: GeneratedQuestion | null;
  classicQuality: number | null;
  graphQuality: number | null;
  simulationGraphQuality: number | null;
};

describe("real Drone Knowledge Pack engine benchmark", () => {
  it("benchmarks actual active Drone Pack data without mutating pack state", () => {
    const pack = loadPack();
    const facts = pack.atomicFacts;
    const approvedFacts = facts.filter((fact) => fact.status === "approved");
    const conceptsById = Object.fromEntries(pack.concepts.map((concept) => [concept.id, concept]));
    const categoriesByConceptId = Object.fromEntries(pack.concepts.map((concept) => [concept.id, concept.categoryIds ?? []]));

    expect(pack.domainPack.categories).toHaveLength(32);
    expect(pack.concepts).toHaveLength(116);
    expect(facts).toHaveLength(433);
    expect(approvedFacts).toHaveLength(17);

    const graph = analyzeKnowledgeGraph(PACK_ID, facts);
    const scores = scoreFactsForExam(facts, graph.validatedRelations, { packId: PACK_ID, updatedAt: "2026-07-30T00:00:00.000Z" });
    const curation = curateRelations(graph.validatedRelations, facts, scores);
    const approvedBenchmarks = approvedFacts.map((fact) => benchmarkApprovedFact({
      fact,
      facts,
      conceptsById,
      categoriesByConceptId,
      templates: pack.questionTemplates,
      distractorRules: pack.distractorRules,
      relations: graph.validatedRelations,
      scores
    }));
    const classicQuestions = approvedBenchmarks.flatMap((item) => item.classicGenerated ? [item.classicGenerated] : []);
    const graphQuestions = approvedBenchmarks.flatMap((item) => item.graphGenerated ? [item.graphGenerated] : []);
    const simulationQuestions = approvedBenchmarks.flatMap((item) => item.simulationGraphGenerated ? [item.simulationGraphGenerated] : []);
    const classicQualityScores = classicQuestions.map((question) => {
      const fact = facts.find((item) => item.id === question.trace.factId)!;
      const context = buildQuestionGenerationContext(fact.id, facts, [], scores);
      return scoreQuestionQuality(question, fact, context, [], scores.find((score) => score.factId === fact.id));
    });
    const selection = selectExamQuestions(classicQuestions, DRONE_BASIC_EXAM_BLUEPRINT, classicQualityScores, scores);
    const decisionRecommendations = buildDecisionRecommendations(graph, curation, scores, approvedBenchmarks, classicQualityScores, pack);

    const markdown = renderMarkdown({
      pack,
      graph,
      curation,
      scores,
      approvedBenchmarks,
      classicQuestions,
      graphQuestions,
      simulationQuestions,
      classicQualityScores,
      selection,
      decisionRecommendations
    });

    writeFileSync(join(process.cwd(), BENCHMARK_DOC), markdown, "utf8");

    expect(graph.totalFacts).toBe(433);
    expect(graph.generatedRelations.length).toBeGreaterThan(0);
    expect(scores).toHaveLength(433);
    expect(approvedBenchmarks).toHaveLength(17);
  }, 30_000);
});

function loadPack() {
  const parsed = JSON.parse(readFileSync(join(process.cwd(), PACK_EXPORT), "utf8")) as ExportWrapper;
  return parsed.pack.pack;
}

function benchmarkApprovedFact(input: {
  fact: AtomicFact;
  facts: AtomicFact[];
  conceptsById: Record<string, Concept>;
  categoriesByConceptId: Record<string, string[]>;
  templates: QuestionTemplate[];
  distractorRules: DistractorRule[];
  relations: KnowledgeRelation[];
  scores: ReturnType<typeof scoreFactsForExam>;
}): ApprovedFactBenchmark {
  const score = input.scores.find((item) => item.factId === input.fact.id);
  const suitableTemplates = input.templates.filter((template) => isTemplateSuitableForFact(template, input.fact, input.facts, input.categoriesByConceptId));
  const productionGraph: KnowledgeRelation[] = input.relations.filter((relation) => relation.reviewStatus === "approved");
  const firstClassic = firstGeneratedQuestion(input.fact, suitableTemplates, input, []);
  const firstGraph = firstGraphQuestion(input.fact, suitableTemplates, input, productionGraph);
  const firstSimulationGraph = firstGraphQuestion(input.fact, suitableTemplates, input, input.relations);
  const simulationContext = buildQuestionGenerationContext(input.fact.id, input.facts, input.relations, input.scores);
  const productionContext = buildQuestionGenerationContext(input.fact.id, input.facts, productionGraph, input.scores);

  return {
    factId: input.fact.id,
    examValue: score?.overallScore ?? 0,
    suitableTemplates: suitableTemplates.map((template) => template.id),
    graphRelationCandidates: input.relations.filter((relation) => relation.fromFactId === input.fact.id || relation.toFactId === input.fact.id).length,
    distractorCandidateCount: countDistractorCandidates(input.fact.id, input.relations),
    classicGenerated: firstClassic,
    graphGenerated: firstGraph,
    simulationGraphGenerated: firstSimulationGraph,
    classicQuality: firstClassic ? scoreQuestionQuality(firstClassic, input.fact, productionContext, productionGraph, score).overallScore : null,
    graphQuality: firstGraph ? scoreQuestionQuality(firstGraph, input.fact, productionContext, productionGraph, score).overallScore : null,
    simulationGraphQuality: firstSimulationGraph ? scoreQuestionQuality(firstSimulationGraph, input.fact, simulationContext, input.relations, score).overallScore : null
  };
}

function firstGeneratedQuestion(
  fact: AtomicFact,
  templates: QuestionTemplate[],
  input: {
    facts: AtomicFact[];
    conceptsById: Record<string, Concept>;
    categoriesByConceptId: Record<string, string[]>;
    distractorRules: DistractorRule[];
  },
  relations: KnowledgeRelation[]
) {
  const context = buildQuestionGenerationContext(fact.id, input.facts, relations, []);
  for (const template of templates) {
    const question = compileQuestion({
      examId: "real-data-benchmark",
      subjectId: "kr-aviation-safety-act",
      categoriesByConceptId: input.categoriesByConceptId,
      conceptsById: input.conceptsById,
      facts: input.facts,
      fact,
      template,
      distractorRules: input.distractorRules,
      seed: `real:${fact.id}:${template.id}`,
      context: context ?? undefined
    });
    if (question) return question;
  }
  return null;
}

function firstGraphQuestion(
  fact: AtomicFact,
  templates: QuestionTemplate[],
  input: {
    facts: AtomicFact[];
    conceptsById: Record<string, Concept>;
    categoriesByConceptId: Record<string, string[]>;
    distractorRules: DistractorRule[];
    scores: ReturnType<typeof scoreFactsForExam>;
  },
  productionGraph: KnowledgeRelation[]
) {
  for (const template of templates) {
    const result = generateGraphAwareQuestion({
      factId: fact.id,
      examId: "real-data-benchmark",
      subjectId: "kr-aviation-safety-act",
      categoriesByConceptId: input.categoriesByConceptId,
      conceptsById: input.conceptsById,
      facts: input.facts,
      template,
      distractorRules: input.distractorRules,
      seed: `real-graph:${fact.id}:${template.id}`,
      relations: productionGraph,
      scores: input.scores,
      graphContextEnabled: true
    });
    if (result) return result;
  }
  return null;
}

function countDistractorCandidates(factId: string, relations: KnowledgeRelation[]) {
  const candidateIds = new Set<string>();
  for (const relation of relations) {
    if (!["CONFUSED_WITH", "COMPARISON_PAIR", "CONTRASTS_WITH", "RELATED"].includes(relation.relationType)) continue;
    if (relation.fromFactId === factId) candidateIds.add(relation.toFactId);
    if (relation.toFactId === factId) candidateIds.add(relation.fromFactId);
  }
  candidateIds.delete(factId);
  return candidateIds.size;
}

function buildDecisionRecommendations(
  graph: ReturnType<typeof analyzeKnowledgeGraph>,
  curation: ReturnType<typeof curateRelations>,
  scores: ReturnType<typeof scoreFactsForExam>,
  approvedBenchmarks: ApprovedFactBenchmark[],
  qualityScores: ReturnType<typeof scoreQuestionQuality>[],
  pack: KnowledgePack
) {
  const recommendations: DecisionRecommendation[] = [];
  const graphHealth = graph.validatedRelations.length / Math.max(1, graph.generatedRelations.length);
  recommendations.push(...generateDecisionRecommendations(baseDecision("GRAPH_REBUILD", "GRAPH", "draft-graph", {
    graphContext: { hasApprovedGraph: false, healthScore: graphHealth, averageRelationConfidence: average(graph.validatedRelations.map((relation) => relation.confidence)) },
    analyticsContext: { sampleSize: graph.validatedRelations.length }
  })));
  for (const item of approvedBenchmarks.filter((benchmark) => benchmark.examValue >= 0.55 && (benchmark.classicQuality ?? 0) < 0.65).slice(0, 10)) {
    recommendations.push(...generateDecisionRecommendations(baseDecision("QUESTION_REGENERATION", "QUESTION", item.factId, {
      examContext: { examValueScore: item.examValue, questionQualityScore: item.classicQuality ?? 0, sourceConfidence: sourceConfidence(pack.atomicFacts.find((fact) => fact.id === item.factId)) },
      analyticsContext: { sampleSize: 17 }
    })));
  }
  recommendations.push(...generateDecisionRecommendations(baseDecision("REVIEW_PRIORITY", "PACK", PACK_ID, {
    analyticsContext: { reviewBacklogCount: curation.reviewCandidates.length, sampleSize: curation.reviewCandidates.length }
  })));
  recommendations.push(...generateDecisionRecommendations(baseDecision("PACK_HEALTH", "PACK", PACK_ID, {
    analyticsContext: { sourceCoverageScore: sourceCoverage(pack.atomicFacts), sampleSize: pack.atomicFacts.length }
  })));
  for (const score of qualityScores.filter((quality) => quality.overallScore < 0.55).slice(0, 5)) {
    recommendations.push(...generateDecisionRecommendations(baseDecision("QUESTION_REGENERATION", "QUESTION", score.factId, {
      examContext: { examValueScore: scores.find((item) => item.factId === score.factId)?.overallScore ?? 0, questionQualityScore: score.overallScore },
      analyticsContext: { sampleSize: 17 }
    })));
  }
  return recommendations;
}

function baseDecision(
  decisionType: DecisionSupportContext["decisionType"],
  targetType: DecisionSupportContext["targetType"],
  targetId: string,
  partial: Partial<DecisionSupportContext>
): DecisionSupportContext {
  return {
    decisionId: `real:${decisionType}:${targetId}`,
    domainId: "kr-drone-license",
    packId: PACK_ID,
    decisionType,
    targetType,
    targetId,
    createdAt: "2026-07-30T00:00:00.000Z",
    ...partial
  };
}

function renderMarkdown(input: {
  pack: KnowledgePack;
  graph: ReturnType<typeof analyzeKnowledgeGraph>;
  curation: ReturnType<typeof curateRelations>;
  scores: ReturnType<typeof scoreFactsForExam>;
  approvedBenchmarks: ApprovedFactBenchmark[];
  classicQuestions: GeneratedQuestion[];
  graphQuestions: GeneratedQuestion[];
  simulationQuestions: GeneratedQuestion[];
  classicQualityScores: ReturnType<typeof scoreQuestionQuality>[];
  selection: ReturnType<typeof selectExamQuestions>;
  decisionRecommendations: DecisionRecommendation[];
}) {
  const approvedFacts = input.pack.atomicFacts.filter((fact) => fact.status === "approved");
  const relationDegree = relationDegreeTop(input.graph.validatedRelations);
  const isolatedFacts = countIsolatedFacts(input.pack.atomicFacts, input.graph.validatedRelations);
  const averageRelationsPerFact = input.graph.validatedRelations.length * 2 / Math.max(1, input.pack.atomicFacts.length);
  const maxRelationsPerFact = relationDegree[0]?.degree ?? 0;
  const productionGraphApproved = input.graph.validatedRelations.filter((relation) => relation.reviewStatus === "approved").length;
  const topScores = [...input.scores].sort((left, right) => right.overallScore - left.overallScore);
  const bottomScores = [...input.scores].sort((left, right) => left.overallScore - right.overallScore);
  const numericFacts = input.pack.atomicFacts.filter(isNumericFact);
  const penaltyFacts = input.scores.filter((score) => score.penaltyRiskScore > 0);
  const exceptionFacts = input.pack.atomicFacts.filter((fact) => fact.exceptions.length || fact.exceptionGroupReference);
  const lowSourceConfidenceFacts = input.pack.atomicFacts.filter((fact) => sourceConfidence(fact) < 0.8);
  const sampleQa = buildRelationQualitySamples(input.graph.validatedRelations, input.pack.atomicFacts);
  const sampleQaSummary = SAMPLE_QA_TYPES.map((type) => {
    const rows = sampleQa[type];
    return [
      type,
      String(rows.filter((row) => row.verdict === "PASS").length),
      String(rows.filter((row) => row.verdict === "WEAK").length),
      String(rows.filter((row) => row.verdict === "INVALID").length)
    ];
  });

  return [
    "# Real Data Engine Benchmark",
    "",
    `Generated at: 2026-07-30`,
    "",
    "## Source Pack",
    "",
    `- Source file: \`${PACK_EXPORT}\``,
    `- Pack ID: ${PACK_ID}`,
    `- Category: ${input.pack.domainPack.categories.length}`,
    `- Concept: ${input.pack.concepts.length}`,
    `- AtomicFact: ${input.pack.atomicFacts.length}`,
    `- approved AtomicFact: ${approvedFacts.length}`,
    `- QuestionTemplate: ${input.pack.questionTemplates.length}`,
    `- DistractorRule: ${input.pack.distractorRules.length}`,
    "",
    "## Graph Analysis",
    "",
    `- Generated relations: ${input.graph.generatedRelations.length}`,
    `- Validated relations: ${input.graph.validatedRelations.length}`,
    `- Rejected relations: ${input.graph.rejectedRelations.length}`,
    `- Production approved graph relations: ${productionGraphApproved}`,
    `- Curation approved candidates: ${input.curation.approvedCandidates.length}`,
    `- Curation review candidates: ${input.curation.reviewCandidates.length}`,
    `- Curation rejected candidates: ${input.curation.rejectedCandidates.length}`,
    `- Isolated facts: ${isolatedFacts}`,
    `- Average relations per fact: ${averageRelationsPerFact.toFixed(2)}`,
    `- Max relations per fact: ${maxRelationsPerFact}`,
    "",
    "### Before / After precision comparison",
    "",
    table(["Metric", "Before", "After", "Delta"], [
      ["Generated relations", String(BEFORE_GRAPH_STATS.generatedRelations), String(input.graph.generatedRelations.length), signedDelta(input.graph.generatedRelations.length - BEFORE_GRAPH_STATS.generatedRelations)],
      ["Validated relations", String(BEFORE_GRAPH_STATS.validatedRelations), String(input.graph.validatedRelations.length), signedDelta(input.graph.validatedRelations.length - BEFORE_GRAPH_STATS.validatedRelations)],
      ["Approved candidates", String(BEFORE_GRAPH_STATS.approvedCandidates), String(input.curation.approvedCandidates.length), signedDelta(input.curation.approvedCandidates.length - BEFORE_GRAPH_STATS.approvedCandidates)],
      ["Review candidates", String(BEFORE_GRAPH_STATS.reviewCandidates), String(input.curation.reviewCandidates.length), signedDelta(input.curation.reviewCandidates.length - BEFORE_GRAPH_STATS.reviewCandidates)],
      ["Isolated facts", String(BEFORE_GRAPH_STATS.isolatedFacts), String(isolatedFacts), signedDelta(isolatedFacts - BEFORE_GRAPH_STATS.isolatedFacts)],
      ["SAME_CONCEPT", String(BEFORE_GRAPH_STATS.relationSummary.SAME_CONCEPT), String(input.graph.relationSummary.SAME_CONCEPT), signedDelta(input.graph.relationSummary.SAME_CONCEPT - BEFORE_GRAPH_STATS.relationSummary.SAME_CONCEPT)],
      ["CONFUSED_WITH", String(BEFORE_GRAPH_STATS.relationSummary.CONFUSED_WITH), String(input.graph.relationSummary.CONFUSED_WITH), signedDelta(input.graph.relationSummary.CONFUSED_WITH - BEFORE_GRAPH_STATS.relationSummary.CONFUSED_WITH)],
      ["CONTRASTS_WITH", String(BEFORE_GRAPH_STATS.relationSummary.CONTRASTS_WITH), String(input.graph.relationSummary.CONTRASTS_WITH), signedDelta(input.graph.relationSummary.CONTRASTS_WITH - BEFORE_GRAPH_STATS.relationSummary.CONTRASTS_WITH)],
      ["COMPARISON_PAIR", String(BEFORE_GRAPH_STATS.relationSummary.COMPARISON_PAIR), String(input.graph.relationSummary.COMPARISON_PAIR), signedDelta(input.graph.relationSummary.COMPARISON_PAIR - BEFORE_GRAPH_STATS.relationSummary.COMPARISON_PAIR)]
    ]),
    "",
    "### Changed relation heuristics",
    "",
    "- SAME_CONCEPT is no longer generated by concept equality alone; it now requires at least two semantic signals among predicate, subject/object, numeric value, unit, condition, exception, or applicability overlap, then keeps only top candidates per fact.",
    "- CONFUSED_WITH now requires similar predicate, same unit, different value, comparable applicability, and an explicit safe-distractor contrast.",
    "- CONTRASTS_WITH now requires an explicit contrast axis such as operator contrast, allow/prohibit contrast, exception contrast, or legal condition contrast.",
    "- COMPARISON_PAIR now requires same predicate and unit with a different numeric threshold/value plus clear target or purpose contrast.",
    "- Relation caps are applied after scoring: max 15 total relations per fact, with type caps for CONFUSED_WITH 4, COMPARISON_PAIR 4, CONTRASTS_WITH 3, SAME_CONCEPT 5.",
    "- Curation now prioritizes precision: approved_candidate >= 0.92 and review_candidate >= 0.75.",
    "",
    "### Relation type counts",
    "",
    table(["Type", "Count"], Object.entries(input.graph.relationSummary).map(([type, count]) => [type, String(count)])),
    "",
    "### Curation score summary",
    "",
    table(["Metric", "Value"], Object.entries(input.curation.qualitySummary).map(([key, value]) => [key, String(value)])),
    "",
    "### Over-connected facts Top 20",
    "",
    table(["Rank", "Fact", "Degree"], relationDegree.slice(0, 20).map((item, index) => [String(index + 1), item.factId, String(item.degree)])),
    "",
    "### Relation quality sample QA",
    "",
    "These samples are a deterministic manual-QA aid over real generated relations. PASS means the reason names concrete signals that make the relation reviewable; WEAK means useful but still needs human confirmation; INVALID means the relation should not enter a human approval queue without better evidence.",
    "",
    table(["Type", "PASS", "WEAK", "INVALID"], sampleQaSummary),
    "",
    ...SAMPLE_QA_TYPES.flatMap((type) => [
      `#### ${type} sample`,
      "",
      table(
        ["#", "From", "To", "Confidence", "Verdict", "Reason"],
        sampleQa[type].map((sample, index) => [
          String(index + 1),
          sample.fromFactId,
          sample.toFactId,
          sample.confidence.toFixed(2),
          sample.verdict,
          sample.reason
        ])
      ),
      ""
    ]),
    "",
    "## ExamValueScore",
    "",
    "### Top 30",
    "",
    factScoreTable(topScores.slice(0, 30), input.pack.atomicFacts),
    "",
    "### Bottom 30",
    "",
    factScoreTable(bottomScores.slice(0, 30), input.pack.atomicFacts),
    "",
    `- Numeric facts: ${numericFacts.length}`,
    `- Penalty-risk facts: ${penaltyFacts.length}`,
    `- Exception-context facts: ${exceptionFacts.length}`,
    `- Low source confidence facts: ${lowSourceConfidenceFacts.length}`,
    "",
    "## Approved 17 Fact Generation Readiness",
    "",
    table(
      ["Fact", "ExamValue", "Templates", "Relations", "Distractors", "Classic", "ProdGraph", "SimGraph", "ClassicQ", "ProdGraphQ", "SimGraphQ"],
      input.approvedBenchmarks.map((item) => [
        item.factId,
        item.examValue.toFixed(2),
        String(item.suitableTemplates.length),
        String(item.graphRelationCandidates),
        String(item.distractorCandidateCount),
        item.classicGenerated ? "yes" : "no",
        item.graphGenerated ? "yes" : "no",
        item.simulationGraphGenerated ? "yes" : "no",
        nullableScore(item.classicQuality),
        nullableScore(item.graphQuality),
        nullableScore(item.simulationGraphQuality)
      ])
    ),
    "",
    "## Question Generation A/B",
    "",
    `- A. Classic compiler generated: ${input.classicQuestions.length}/${approvedFacts.length}`,
    `- B. Graph-aware generator with production approved graph generated: ${input.graphQuestions.length}/${approvedFacts.length}`,
    `- Simulation with draft validated relations generated: ${input.simulationQuestions.length}/${approvedFacts.length}`,
    `- Production graph is not faked: approved graph relation count remains ${productionGraphApproved}.`,
    `- Classic average quality: ${average(input.approvedBenchmarks.flatMap((item) => item.classicQuality === null ? [] : [item.classicQuality])).toFixed(2)}`,
    `- Production graph-aware average quality: ${average(input.approvedBenchmarks.flatMap((item) => item.graphQuality === null ? [] : [item.graphQuality])).toFixed(2)}`,
    `- Simulation graph-aware average quality: ${average(input.approvedBenchmarks.flatMap((item) => item.simulationGraphQuality === null ? [] : [item.simulationGraphQuality])).toFixed(2)}`,
    `- Classic duplicate distractor rows: ${countDuplicateDistractors(input.classicQuestions)}`,
    `- Classic unique-correct failures: ${countUniqueCorrectFailures(input.classicQuestions)}`,
    "",
    "## Exam Selection",
    "",
    `- Requested exam size: ${DRONE_BASIC_EXAM_BLUEPRINT.examSize}`,
    `- Actually selectable questions: ${input.selection.totalCount}`,
    `- Average quality: ${input.selection.averageQualityScore}`,
    `- Average exam value: ${input.selection.averageExamValueScore}`,
    `- Duplicate warnings: ${input.selection.duplicateWarnings.length ? input.selection.duplicateWarnings.join("; ") : "none"}`,
    "",
    "### Difficulty balance",
    "",
    table(["Difficulty", "Target", "Actual", "Ratio"], Object.entries(input.selection.difficultyBalance).map(([key, value]) => [key, String(value.target), String(value.actual), String(value.ratio)])),
    "",
    "### Category balance",
    "",
    table(["Category", "Target", "Actual", "Ratio"], Object.entries(input.selection.categoryBalance).map(([key, value]) => [key, String(value.target), String(value.actual), String(value.ratio)]).slice(0, 40)),
    "",
    "## Decision Support Results",
    "",
    table(["Priority", "Type", "Target", "Action", "Confidence", "Human"], input.decisionRecommendations.map((item) => [
      item.priority,
      item.decisionType,
      item.targetId,
      item.action,
      item.confidence.toFixed(2),
      item.requiresHumanApproval ? "yes" : "no"
    ])),
    "",
    "## Synthetic vs Real Data Difference",
    "",
    "- Synthetic unit tests prove module contracts, but real data exposes scale issues: relation generation creates a very dense graph and SAME_CONCEPT dominates unless curated.",
    "- Actual production graph has 0 approved relations, so graph-aware generation cannot improve production output yet. Draft-relation simulation must remain separate.",
    "- Question generation is constrained mainly by only 17 approved facts, 5 templates, and relation/choice quality rather than by compiler availability alone.",
    "",
    "## Bottlenecks / Heuristic Problems",
    "",
    "- Relation generator is now within the target density range, but review precision still depends on human approval because production graph has 0 approved relations.",
    "- ExamValueScore currently depends on string heuristics and can under-detect Korean penalty/duty words when encoded text or predicate naming varies.",
    "- Approved fact count is far below the 40-question blueprint requirement. Selection cannot honestly fill a full exam.",
    "- Production graph approval workflow is the largest blocker for graph-backed distractors and graph usage scoring.",
    "- Isolated facts increased after pruning broad same-concept links; this is acceptable for precision, but isolated high-value facts should be reviewed separately.",
    "",
    "## Next Implementation Priorities",
    "",
    "1. Start Graph Review with the 12 approved_candidate relations, then process the highest-scoring 680 review_candidate relations by type priority.",
    "2. Expand approved AtomicFacts from 17 toward at least 60 before attempting 40-question exam generation.",
    "3. Improve Korean legal keyword normalization in ExamValueScore and penalty detection.",
    "4. Review the 20 isolated facts and decide whether they need relation hints or should remain standalone.",
    "5. Re-run this benchmark after every approved graph/version milestone.",
    "",
    "## Must Fix Before Adding Other Certifications",
    "",
    "- Need production graph governance, not just draft relation generation.",
    "- Need minimum approved fact coverage per category and difficulty.",
    "- Need benchmark gates in CI to prevent synthetic success from hiding real-data failure.",
    "- Need domain-specific scoring dictionaries per certification."
  ].join("\n");
}

function table(headers: string[], rows: string[][]) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escapeCell).join(" | ")} |`)
  ].join("\n");
}

function factScoreTable(scores: ReturnType<typeof scoreFactsForExam>, facts: AtomicFact[]) {
  return table(["Fact", "Overall", "Importance", "Confusion", "Numeric", "Penalty", "Difficulty", "Statement"], scores.map((score) => {
    const fact = facts.find((item) => item.id === score.factId);
    return [
      score.factId,
      score.overallScore.toFixed(2),
      score.importanceScore.toFixed(2),
      score.confusionScore.toFixed(2),
      score.numericRiskScore.toFixed(2),
      score.penaltyRiskScore.toFixed(2),
      score.difficultyScore.toFixed(2),
      truncate(fact?.statement ?? "", 90)
    ];
  }));
}

function relationDegreeTop(relations: KnowledgeRelation[]) {
  const counts = new Map<string, number>();
  for (const relation of relations) {
    counts.set(relation.fromFactId, (counts.get(relation.fromFactId) ?? 0) + 1);
    counts.set(relation.toFactId, (counts.get(relation.toFactId) ?? 0) + 1);
  }
  return [...counts.entries()].map(([factId, degree]) => ({ factId, degree })).sort((left, right) => right.degree - left.degree || left.factId.localeCompare(right.factId));
}

function countIsolatedFacts(facts: AtomicFact[], relations: KnowledgeRelation[]) {
  const connected = new Set<string>();
  for (const relation of relations) {
    connected.add(relation.fromFactId);
    connected.add(relation.toFactId);
  }
  return facts.filter((fact) => !connected.has(fact.id)).length;
}

type RelationQaVerdict = "PASS" | "WEAK" | "INVALID";

function buildRelationQualitySamples(relations: KnowledgeRelation[], facts: AtomicFact[]) {
  const factsById = new Map(facts.map((fact) => [fact.id, fact]));
  return Object.fromEntries(SAMPLE_QA_TYPES.map((type) => [
    type,
    relations
      .filter((relation) => relation.relationType === type)
      .slice()
      .sort((left, right) => right.confidence - left.confidence || left.fromFactId.localeCompare(right.fromFactId) || left.toFactId.localeCompare(right.toFactId))
      .slice(0, 20)
      .map((relation) => ({
        fromFactId: relation.fromFactId,
        toFactId: relation.toFactId,
        confidence: relation.confidence,
        verdict: judgeRelationSample(relation, factsById),
        reason: truncate(relation.reason, 140)
      }))
  ])) as Record<typeof SAMPLE_QA_TYPES[number], Array<{
    fromFactId: string;
    toFactId: string;
    confidence: number;
    verdict: RelationQaVerdict;
    reason: string;
  }>>;
}

function judgeRelationSample(relation: KnowledgeRelation, factsById: Map<string, AtomicFact>): RelationQaVerdict {
  const reason = relation.reason.toLowerCase();
  const fromFact = factsById.get(relation.fromFactId);
  const toFact = factsById.get(relation.toFactId);
  if (!fromFact || !toFact || relation.fromFactId === relation.toFactId) return "INVALID";

  const hasConcreteReason = [
    "same predicate",
    "similar predicate",
    "different numeric threshold",
    "different value",
    "same unit",
    "exception contrast",
    "applicability contrast",
    "legal condition contrast",
    "operator contrast",
    "allow/prohibit contrast",
    "same subject",
    "same object"
  ].some((signal) => reason.includes(signal));
  if (!hasConcreteReason || reason.trim() === "same concept") return "INVALID";

  const signalCount = [
    "same predicate",
    "similar predicate",
    "different numeric threshold",
    "different value",
    "same unit",
    "applicability contrast",
    "legal condition contrast",
    "exception contrast",
    "same subject",
    "same object"
  ].filter((signal) => reason.includes(signal)).length;

  if (relation.relationType === "CONFUSED_WITH") {
    return reasonIncludesAll(reason, ["predicate", "same unit"]) && reasonIncludesAny(reason, ["different value", "different numeric threshold"]) && relation.confidence >= 0.72 ? "PASS" : "WEAK";
  }
  if (relation.relationType === "COMPARISON_PAIR") {
    return reason.includes("same predicate") && reason.includes("same unit") && reasonIncludesAny(reason, ["different value", "different numeric threshold"]) ? "PASS" : "WEAK";
  }
  if (relation.relationType === "CONTRASTS_WITH") {
    return reasonIncludesAny(reason, ["operator contrast", "allow/prohibit contrast", "exception contrast", "legal condition contrast", "applicability contrast"]) ? "PASS" : "WEAK";
  }
  if (relation.relationType === "SAME_CONCEPT") {
    return signalCount >= 2 && relation.confidence >= 0.62 ? "PASS" : "WEAK";
  }
  return relation.confidence >= 0.7 ? "WEAK" : "INVALID";
}

function reasonIncludesAll(reason: string, fragments: string[]) {
  return fragments.every((fragment) => reason.includes(fragment));
}

function reasonIncludesAny(reason: string, fragments: string[]) {
  return fragments.some((fragment) => reason.includes(fragment));
}

function sourceCoverage(facts: AtomicFact[]) {
  return facts.filter((fact) => fact.sourceReferences.length > 0).length / Math.max(1, facts.length);
}

function sourceConfidence(fact?: AtomicFact) {
  if (!fact) return 0;
  const maybe = (fact as AtomicFact & { confidence?: number }).confidence;
  if (typeof maybe === "number") return maybe;
  return fact.sourceReferences.length ? 0.8 : 0.2;
}

function isNumericFact(fact: AtomicFact) {
  return typeof fact.value === "number" || Boolean(fact.unit) || /\d/.test(fact.statement);
}

function countDuplicateDistractors(questions: GeneratedQuestion[]) {
  return questions.reduce((sum, question) => {
    const texts = question.choices.filter((choice) => !choice.isCorrect).map((choice) => choice.text.trim());
    return sum + (texts.length - new Set(texts).size);
  }, 0);
}

function countUniqueCorrectFailures(questions: GeneratedQuestion[]) {
  return questions.filter((question) => question.choices.filter((choice) => choice.isCorrect).length !== 1).length;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function nullableScore(value: number | null) {
  return value === null ? "-" : value.toFixed(2);
}

function signedDelta(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function escapeCell(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
