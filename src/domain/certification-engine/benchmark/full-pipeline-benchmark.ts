import { existsSync } from "node:fs";
import { compileQuestion, isTemplateSuitableForFact } from "@/domain/exam-engine/compiler/question-compiler";
import { calculateExamCoverage } from "@/domain/exam-engine/coverage/exam-coverage-calculator";
import { scoreQuestionQuality } from "@/domain/exam-engine/evaluation/question-quality-scorer";
import { generateGraphAwareQuestion } from "@/domain/exam-engine/generation/graph-aware-question-generator";
import { buildQuestionGenerationContext } from "@/domain/exam-engine/generation/question-generation-context-builder";
import { scoreFactsForExam } from "@/domain/exam-engine/knowledge-graph/exam-value-scorer";
import { decideFactPromotion } from "@/domain/exam-engine/knowledge-ingestion/auto-promotion/auto-promotion-engine";
import type { FactPromotionDecision } from "@/domain/exam-engine/knowledge-ingestion/auto-promotion/auto-promotion";
import { detectDuplicateFact } from "@/domain/exam-engine/knowledge-ingestion/fact-duplicate-detector";
import { validateFactPromotion } from "@/domain/exam-engine/knowledge-ingestion/fact-promotion-validator";
import type { FactCandidate } from "@/domain/exam-engine/knowledge-ingestion/knowledge-ingestion";
import { analyzeNewKnowledgeSource } from "@/domain/exam-engine/knowledge-ingestion/knowledge-expansion-pipeline";
import { buildLegalFactContexts, parseLegalDocument, reconstructFactCandidates } from "@/domain/exam-engine/knowledge-ingestion/legal-reconstruction";
import { analyzeLegalTablesFromPdf } from "@/domain/exam-engine/knowledge-ingestion/legal-table-intelligence";
import { extractPdfWithQuality, pdfQualityResultToKnowledgeSourceInput } from "@/domain/exam-engine/knowledge-ingestion/pdf-quality";
import { scoreKnowledgeExpansion } from "@/domain/exam-engine/knowledge-ingestion/intelligence";
import { DRONE_BASIC_EXAM_BLUEPRINT } from "@/domain/exam-engine/selection/exam-selection";
import type { AtomicFact, Concept, GeneratedQuestion, KnowledgePack, KnowledgeRelation, QuestionTemplate } from "@/domain/exam-engine/types";

export type FullPipelineBenchmarkInput = {
  packId: string;
  pack: KnowledgePack;
  pdfPath: string;
  activeRelations?: KnowledgeRelation[];
  approvedFactTargetCount?: number;
  examSize?: number;
};

export type FullPipelineDecisionType =
  | "FACT_EXPANSION_REQUIRED"
  | "GRAPH_EXPANSION_REQUIRED"
  | "SOURCE_EXPANSION_REQUIRED"
  | "READY_FOR_EXAM_GENERATION";

export type FullPipelineBenchmarkResult = {
  packId: string;
  inputSource: {
    pdfPath: string;
    exists: boolean;
    sourceId?: string;
    title?: string;
  };
  extraction: {
    pagesProcessed: number;
    extractionQualityScore: number;
    encodingScore: number;
    tableCount: number;
    numericPreservation: number;
    warningCount: number;
  };
  candidates: {
    generalExtraction: number;
    legalReconstruction: number;
    tableIntelligence: number;
    totalCandidates: number;
    duplicateCandidates: number;
    reviewCandidates: number;
    promotionCandidates: number;
  };
  promotion: {
    autoPromotionEligible: number;
    reviewRequired: number;
    rejected: number;
    topCandidates: Array<{
      candidateId: string;
      decision: FactPromotionDecision["decision"];
      score: number;
      expansionScore: number;
    }>;
  };
  coverage: {
    beforePossibleQuestionCount: number;
    afterEstimatedQuestionCount: number;
    categoryCoveredBefore: number;
    categoryCoveredAfterEstimate: number;
    conceptCoveredBefore: number;
    conceptCoveredAfterEstimate: number;
    missingCoverageBefore: number;
    canBuild40Before: boolean;
    canBuild40AfterEstimate: boolean;
  };
  graph: {
    activeRelationCount: number;
    simulationRelated: number;
    simulationComparisonPair: number;
    simulationConfusedWith: number;
    simulationException: number;
    expectedRelations: number;
    graphDensity: number;
    isolatedReductionEstimate: number;
  };
  questions: {
    classicGenerated: number;
    graphAwareGenerated: number;
    simulationEstimatedGenerated: number;
    classicAverageQuality: number;
    graphAwareAverageQuality: number;
    graphUsageScore: number;
    graphBackedDistractors: number;
    categoryBalanceScore: number;
    difficultyBalanceScore: number;
  };
  examBlueprint: {
    examSize: number;
    possible: "YES" | "NO";
    missingCategories: string[];
    missingConcepts: string[];
    missingFactTypes: string[];
  };
  decisions: Array<{
    type: FullPipelineDecisionType;
    priority: "LOW" | "MEDIUM" | "HIGH";
    reason: string;
  }>;
  bottlenecks: string[];
};

export function runFullPipelineBenchmark(input: FullPipelineBenchmarkInput): FullPipelineBenchmarkResult {
  const approvedFacts = input.pack.atomicFacts.filter((fact) => fact.status === "approved");
  const activeRelations = input.activeRelations ?? [];
  const pdfExists = existsSync(input.pdfPath);
  const sourceResult = pdfExists ? processSource(input.pdfPath) : null;
  const source = sourceResult?.source;
  const generalExpansion = source ? analyzeNewKnowledgeSource(source, input.pack.atomicFacts) : null;
  const legalCandidates = source ? reconstructFactCandidates(source, buildLegalFactContexts(parseLegalDocument(source))) : [];
  const tableResult = sourceResult ? analyzeLegalTablesFromPdf(input.pdfPath, sourceResult.source, { qualityResult: sourceResult.quality }) : null;
  const allCandidates = uniqueCandidates([
    ...(generalExpansion ? [
      ...generalExpansion.newCandidates,
      ...generalExpansion.duplicateCandidates,
      ...generalExpansion.reviewCandidates,
      ...generalExpansion.rejectedCandidates
    ] : []),
    ...legalCandidates,
    ...(tableResult?.factCandidates ?? [])
  ]);

  const coverageBefore = calculateExamCoverage(
    input.pack.atomicFacts,
    approvedFacts,
    input.pack.questionTemplates,
    { ...DRONE_BASIC_EXAM_BLUEPRINT, examSize: input.examSize ?? 40 },
    { concepts: input.pack.concepts }
  );

  const candidateAnalyses = allCandidates.map((candidate) => analyzeCandidate(candidate, input.pack, coverageBefore));
  const promotionDecisions = candidateAnalyses.map((analysis) => analysis.promotion);
  const promotionEligible = promotionDecisions.filter((decision) => decision.decision === "AUTO_APPROVE_CANDIDATE");
  const highQualityCandidates = candidateAnalyses
    .filter((analysis) => analysis.promotion.decision === "AUTO_APPROVE_CANDIDATE" || analysis.expansion.finalExpansionScore >= 0.68)
    .sort((left, right) => right.expansion.finalExpansionScore - left.expansion.finalExpansionScore)
    .slice(0, Math.max(0, (input.approvedFactTargetCount ?? 40) - approvedFacts.length));

  const questionBenchmark = benchmarkQuestions(input.pack, activeRelations);
  const expectedQuestionIncrease = estimateQuestionIncrease(highQualityCandidates.map((analysis) => analysis.candidate), input.pack.questionTemplates);
  const graphSimulation = simulateGraphExpansion(highQualityCandidates.map((analysis) => analysis.candidate), input.pack.atomicFacts, activeRelations);
  const categoryGain = countNewHints(highQualityCandidates.map((analysis) => analysis.candidate.categoryHint), approvedFacts, "category", input.pack.concepts);
  const conceptGain = countNewHints(highQualityCandidates.map((analysis) => analysis.candidate.conceptHint), approvedFacts, "concept", input.pack.concepts);
  const afterEstimatedQuestionCount = coverageBefore.possibleQuestionCount + expectedQuestionIncrease;
  const examSize = input.examSize ?? 40;
  const missingCategories = coverageBefore.categoryCoverage.filter((entry) => entry.status !== "COVERED").map((entry) => entry.id);
  const missingConcepts = coverageBefore.conceptCoverage.filter((entry) => entry.status === "MISSING").map((entry) => entry.id).slice(0, 30);
  const missingFactTypes = missingTemplateFactTypes(coverageBefore.templateCoverage);
  const decisions = buildDecisions({
    pdfExists,
    coverageBeforePossible: coverageBefore.possibleQuestionCount,
    afterEstimatedQuestionCount,
    examSize,
    activeRelations: activeRelations.length,
    expectedRelations: graphSimulation.expectedRelations,
    autoEligible: promotionEligible.length
  });

  return {
    packId: input.packId,
    inputSource: {
      pdfPath: input.pdfPath,
      exists: pdfExists,
      sourceId: source?.sourceId,
      title: source?.title
    },
    extraction: sourceResult ? {
      pagesProcessed: sourceResult.quality.pages.length,
      extractionQualityScore: sourceResult.quality.extractionQualityScore.overallScore,
      encodingScore: sourceResult.quality.extractionQualityScore.encodingScore,
      tableCount: sourceResult.quality.tables.length,
      numericPreservation: sourceResult.quality.extractionQualityScore.numericScore,
      warningCount: sourceResult.quality.warnings.length
    } : emptyExtraction(),
    candidates: {
      generalExtraction: generalExpansion ? generalExpansion.newCandidates.length + generalExpansion.duplicateCandidates.length + generalExpansion.reviewCandidates.length + generalExpansion.rejectedCandidates.length : 0,
      legalReconstruction: legalCandidates.length,
      tableIntelligence: tableResult?.factCandidates.length ?? 0,
      totalCandidates: allCandidates.length,
      duplicateCandidates: candidateAnalyses.filter((analysis) => analysis.duplicate.isDuplicate).length,
      reviewCandidates: promotionDecisions.filter((decision) => decision.decision === "REVIEW_REQUIRED").length,
      promotionCandidates: promotionEligible.length
    },
    promotion: {
      autoPromotionEligible: promotionEligible.length,
      reviewRequired: promotionDecisions.filter((decision) => decision.decision === "REVIEW_REQUIRED").length,
      rejected: promotionDecisions.filter((decision) => decision.decision === "REJECT_CANDIDATE").length,
      topCandidates: candidateAnalyses
        .sort((left, right) => right.expansion.finalExpansionScore - left.expansion.finalExpansionScore)
        .slice(0, 20)
        .map((analysis) => ({
          candidateId: analysis.candidate.candidateId,
          decision: analysis.promotion.decision,
          score: analysis.promotion.score,
          expansionScore: analysis.expansion.finalExpansionScore
        }))
    },
    coverage: {
      beforePossibleQuestionCount: coverageBefore.possibleQuestionCount,
      afterEstimatedQuestionCount,
      categoryCoveredBefore: coverageBefore.categoryCoverage.filter((entry) => entry.status === "COVERED").length,
      categoryCoveredAfterEstimate: Math.min(coverageBefore.categoryCoverage.length, coverageBefore.categoryCoverage.filter((entry) => entry.status === "COVERED").length + categoryGain),
      conceptCoveredBefore: coverageBefore.conceptCoverage.filter((entry) => entry.status !== "MISSING").length,
      conceptCoveredAfterEstimate: Math.min(coverageBefore.conceptCoverage.length, coverageBefore.conceptCoverage.filter((entry) => entry.status !== "MISSING").length + conceptGain),
      missingCoverageBefore: coverageBefore.missingCoverage.length,
      canBuild40Before: coverageBefore.possibleQuestionCount >= examSize,
      canBuild40AfterEstimate: afterEstimatedQuestionCount >= examSize
    },
    graph: graphSimulation,
    questions: questionBenchmark,
    examBlueprint: {
      examSize,
      possible: afterEstimatedQuestionCount >= examSize ? "YES" : "NO",
      missingCategories,
      missingConcepts,
      missingFactTypes
    },
    decisions,
    bottlenecks: bottlenecks({
      pdfExists,
      extractionQuality: sourceResult?.quality.extractionQualityScore.overallScore ?? 0,
      tableCount: sourceResult?.quality.tables.length ?? 0,
      beforePossibleQuestionCount: coverageBefore.possibleQuestionCount,
      afterEstimatedQuestionCount,
      examSize,
      activeRelations: activeRelations.length,
      autoEligible: promotionEligible.length
    })
  };
}

function processSource(pdfPath: string) {
  const quality = extractPdfWithQuality(pdfPath, {
    sourceId: "drone-air-safety-act-pdf",
    sourceType: "LAW",
    title: "항공안전법 PDF",
    version: "benchmark-source",
    maxPages: 8,
    maxCharacters: 80_000
  });
  return {
    quality,
    source: pdfQualityResultToKnowledgeSourceInput(pdfPath, quality, {
      sourceType: "LAW",
      title: "항공안전법 PDF",
      version: "benchmark-source"
    })
  };
}

function analyzeCandidate(candidate: FactCandidate, pack: KnowledgePack, currentCoverage: ReturnType<typeof calculateExamCoverage>) {
  const duplicate = detectDuplicateFact(candidate, pack.atomicFacts);
  const validation = validateFactPromotion(candidate, pack.atomicFacts, pack.sourceDocuments);
  const graphContext = {
    relatedFactCount: relatedFactCount(candidate, pack.atomicFacts),
    compatibleRelationCount: relatedFactCount(candidate, pack.atomicFacts),
    contradictionCount: 0,
    examValueScore: candidate.confidence,
    expectedQuestionIncrease: estimateQuestionIncrease([candidate], pack.questionTemplates),
    expectedCoverageIncrease: candidate.categoryHint || candidate.conceptHint ? 1 : 0
  };
  const expansion = scoreKnowledgeExpansion(candidate, {
    currentCoverage,
    questionTemplates: pack.questionTemplates,
    existingConceptIds: pack.concepts.map((concept) => concept.id),
    existingCategoryIds: [...new Set(pack.concepts.flatMap((concept) => concept.categoryIds))],
    existingFactSignals: pack.atomicFacts.map((fact) => ({
      conceptId: fact.conceptId,
      predicate: fact.predicate,
      value: fact.value,
      sourceDocumentId: fact.sourceReferences[0]?.documentId
    })),
    graphContext: {
      relatedFactCount: graphContext.relatedFactCount,
      confusedWithPossible: candidate.extractedNumbers.length > 0,
      comparisonPairPossible: candidate.extractedNumbers.length > 0,
      resolvesIsolatedFact: false
    },
    qualityScore: candidate.confidence
  });
  const promotion = decideFactPromotion(candidate, {
    validation,
    duplicateResult: duplicate,
    graphContext: {
      ...graphContext,
      expectedCoverageIncrease: expansion.coverageImpactScore
    },
    sourceType: "LAW",
    expansionScore: expansion.finalExpansionScore
  });
  return { candidate, duplicate, validation, expansion, promotion };
}

function benchmarkQuestions(pack: KnowledgePack, activeRelations: KnowledgeRelation[]): FullPipelineBenchmarkResult["questions"] {
  const approvedFacts = pack.atomicFacts.filter((fact) => fact.status === "approved");
  const scores = scoreFactsForExam(pack.atomicFacts, activeRelations, { packId: "benchmark" });
  const conceptsById = Object.fromEntries(pack.concepts.map((concept) => [concept.id, concept]));
  const categoriesByConceptId = Object.fromEntries(pack.concepts.map((concept) => [concept.id, concept.categoryIds]));
  const classicQuestions = approvedFacts.flatMap((fact) => firstClassicQuestion(fact, pack, conceptsById, categoriesByConceptId) ?? []);
  const graphQuestions = approvedFacts.flatMap((fact) => firstGraphQuestion(fact, pack, conceptsById, categoriesByConceptId, activeRelations, scores) ?? []);
  const classicQuality = classicQuestions.map((question) => scoreGenerated(question, pack, [], scores));
  const graphQuality = graphQuestions.map((question) => scoreGenerated(question, pack, activeRelations, scores));

  return {
    classicGenerated: classicQuestions.length,
    graphAwareGenerated: graphQuestions.length,
    simulationEstimatedGenerated: graphQuestions.length,
    classicAverageQuality: round(average(classicQuality.map((score) => score.overallScore))),
    graphAwareAverageQuality: round(average(graphQuality.map((score) => score.overallScore))),
    graphUsageScore: round(average(graphQuality.map((score) => score.graphUsageScore))),
    graphBackedDistractors: graphQuestions.reduce((sum, question) => sum + countGraphBackedDistractors(question, activeRelations), 0),
    categoryBalanceScore: round(balanceScore(classicQuestions.flatMap((question) => question.categoryIds))),
    difficultyBalanceScore: round(balanceScore(classicQuestions.map((question) => question.difficulty)))
  };
}

function firstClassicQuestion(
  fact: AtomicFact,
  pack: KnowledgePack,
  conceptsById: Record<string, Concept>,
  categoriesByConceptId: Record<string, string[]>
) {
  for (const template of suitableTemplates(fact, pack, categoriesByConceptId)) {
    const question = compileQuestion({
      examId: "full-pipeline-benchmark",
      subjectId: "kr-aviation-safety-act",
      categoriesByConceptId,
      conceptsById,
      facts: pack.atomicFacts,
      fact,
      template,
      distractorRules: pack.distractorRules,
      seed: `full:classic:${fact.id}:${template.id}`
    });
    if (question) return question;
  }
  return null;
}

function firstGraphQuestion(
  fact: AtomicFact,
  pack: KnowledgePack,
  conceptsById: Record<string, Concept>,
  categoriesByConceptId: Record<string, string[]>,
  relations: KnowledgeRelation[],
  scores: ReturnType<typeof scoreFactsForExam>
) {
  for (const template of suitableTemplates(fact, pack, categoriesByConceptId)) {
    const question = generateGraphAwareQuestion({
      factId: fact.id,
      examId: "full-pipeline-benchmark",
      subjectId: "kr-aviation-safety-act",
      categoriesByConceptId,
      conceptsById,
      facts: pack.atomicFacts,
      template,
      distractorRules: pack.distractorRules,
      seed: `full:graph:${fact.id}:${template.id}`,
      relations,
      scores,
      graphContextEnabled: true
    });
    if (question) return question;
  }
  return null;
}

function suitableTemplates(fact: AtomicFact, pack: KnowledgePack, categoriesByConceptId: Record<string, string[]>) {
  return pack.questionTemplates.filter((template) => isTemplateSuitableForFact(template, fact, pack.atomicFacts, categoriesByConceptId));
}

function scoreGenerated(
  question: GeneratedQuestion,
  pack: KnowledgePack,
  relations: KnowledgeRelation[],
  scores: ReturnType<typeof scoreFactsForExam>
) {
  const fact = pack.atomicFacts.find((item) => item.id === question.trace.factId)!;
  const context = buildQuestionGenerationContext(fact.id, pack.atomicFacts, relations, scores);
  return scoreQuestionQuality(question, fact, context, relations, scores.find((score) => score.factId === fact.id));
}

function simulateGraphExpansion(candidates: FactCandidate[], facts: AtomicFact[], activeRelations: KnowledgeRelation[]): FullPipelineBenchmarkResult["graph"] {
  const comparison = candidates.filter((candidate) => candidate.extractedNumbers.length > 0).length;
  const exception = candidates.filter((candidate) => candidate.extractedExceptions.length > 0).length;
  const related = candidates.filter((candidate) => relatedFactCount(candidate, facts) > 0).length;
  const confused = Math.min(comparison, candidates.filter((candidate) => candidate.extractedConditions.length > 0).length);
  const expectedRelations = related + comparison + exception + confused;
  return {
    activeRelationCount: activeRelations.length,
    simulationRelated: related,
    simulationComparisonPair: comparison,
    simulationConfusedWith: confused,
    simulationException: exception,
    expectedRelations,
    graphDensity: round((activeRelations.length + expectedRelations) / Math.max(1, facts.length)),
    isolatedReductionEstimate: Math.min(related, candidates.length)
  };
}

function relatedFactCount(candidate: FactCandidate, facts: AtomicFact[]) {
  const text = `${candidate.statement} ${candidate.conceptHint ?? ""} ${candidate.categoryHint ?? ""}`;
  return facts.filter((fact) => {
    if (candidate.conceptHint && candidate.conceptHint === fact.conceptId) return true;
    return [fact.subject, fact.predicate, String(fact.value), fact.unit].filter(Boolean).some((signal) => text.includes(String(signal)));
  }).slice(0, 20).length;
}

function estimateQuestionIncrease(candidates: FactCandidate[], templates: QuestionTemplate[]) {
  return candidates.reduce((sum, candidate) => {
    const numeric = candidate.extractedNumbers.length ? 1 : 0;
    const conditions = candidate.extractedConditions.length ? 1 : 0;
    const exceptions = candidate.extractedExceptions.length ? 1 : 0;
    const templatePotential = Math.min(3, numeric + conditions + exceptions + (candidate.statement.length > 20 ? 1 : 0));
    return sum + Math.min(templates.length, Math.max(1, templatePotential));
  }, 0);
}

function uniqueCandidates(candidates: FactCandidate[]) {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const signature = candidate.statement.replace(/\s+/g, " ").trim();
    if (!signature || seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

function countNewHints(hints: Array<string | undefined>, approvedFacts: AtomicFact[], mode: "category" | "concept", concepts: Concept[]) {
  const approvedConcepts = new Set(approvedFacts.map((fact) => fact.conceptId));
  const approvedCategories = new Set(concepts.filter((concept) => approvedConcepts.has(concept.id)).flatMap((concept) => concept.categoryIds));
  const existing = mode === "concept" ? approvedConcepts : approvedCategories;
  return [...new Set(hints.filter((hint): hint is string => Boolean(hint)))].filter((hint) => !existing.has(hint)).length;
}

function missingTemplateFactTypes(templateCoverage: ReturnType<typeof calculateExamCoverage>["templateCoverage"]) {
  return templateCoverage.filter((entry) => entry.status === "MISSING").map((entry) => entry.id);
}

function buildDecisions(input: {
  pdfExists: boolean;
  coverageBeforePossible: number;
  afterEstimatedQuestionCount: number;
  examSize: number;
  activeRelations: number;
  expectedRelations: number;
  autoEligible: number;
}): FullPipelineBenchmarkResult["decisions"] {
  const decisions: FullPipelineBenchmarkResult["decisions"] = [];
  if (!input.pdfExists) decisions.push({ type: "SOURCE_EXPANSION_REQUIRED", priority: "HIGH", reason: "Input PDF was not found." });
  if (input.coverageBeforePossible < input.examSize) decisions.push({ type: "FACT_EXPANSION_REQUIRED", priority: "HIGH", reason: `Current possible questions ${input.coverageBeforePossible}/${input.examSize}.` });
  if (input.activeRelations < 20 || input.expectedRelations > 0) decisions.push({ type: "GRAPH_EXPANSION_REQUIRED", priority: "MEDIUM", reason: `Active relations=${input.activeRelations}, simulated new relations=${input.expectedRelations}.` });
  if (input.afterEstimatedQuestionCount >= input.examSize && input.autoEligible > 0) decisions.push({ type: "READY_FOR_EXAM_GENERATION", priority: "LOW", reason: `Simulation reaches ${input.afterEstimatedQuestionCount}/${input.examSize}; human approval still required.` });
  return decisions;
}

function bottlenecks(input: {
  pdfExists: boolean;
  extractionQuality: number;
  tableCount: number;
  beforePossibleQuestionCount: number;
  afterEstimatedQuestionCount: number;
  examSize: number;
  activeRelations: number;
  autoEligible: number;
}) {
  const issues: string[] = [];
  if (!input.pdfExists) issues.push("Source PDF missing.");
  if (input.extractionQuality < 0.7) issues.push("PDF extraction quality below 0.70.");
  if (input.tableCount === 0) issues.push("No reliable legal table extracted.");
  if (input.beforePossibleQuestionCount < input.examSize) issues.push("Approved Fact coverage is below 40-question blueprint.");
  if (input.afterEstimatedQuestionCount < input.examSize) issues.push("Candidate simulation still does not reach 40 questions.");
  if (input.activeRelations < 20) issues.push("Active graph remains sparse.");
  if (input.autoEligible === 0) issues.push("No candidate is safe for automatic promotion; human review remains required.");
  return issues;
}

function emptyExtraction(): FullPipelineBenchmarkResult["extraction"] {
  return {
    pagesProcessed: 0,
    extractionQualityScore: 0,
    encodingScore: 0,
    tableCount: 0,
    numericPreservation: 0,
    warningCount: 1
  };
}

function countGraphBackedDistractors(question: GeneratedQuestion, relations: KnowledgeRelation[]) {
  const relationFactIds = new Set(relations.flatMap((relation) => [relation.fromFactId, relation.toFactId]));
  return question.choices.filter((choice) => !choice.isCorrect && choice.sourceFactIds.some((factId) => relationFactIds.has(factId))).length;
}

function balanceScore(values: string[]) {
  if (!values.length) return 0;
  const counts = [...values.reduce((map, value) => map.set(value, (map.get(value) ?? 0) + 1), new Map<string, number>()).values()];
  const max = Math.max(...counts);
  const min = Math.min(...counts);
  return max === 0 ? 0 : min / max;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
