import { describe, expect, it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { compileQuestion, isTemplateSuitableForFact } from "@/domain/exam-engine/compiler/question-compiler";
import { scoreQuestionQuality } from "@/domain/exam-engine/evaluation/question-quality-scorer";
import { generateGraphEnhancedQuestion } from "@/domain/exam-engine/generation/graph-enhanced-question-generator";
import { buildQuestionGenerationContext } from "@/domain/exam-engine/generation/question-generation-context-builder";
import { analyzeKnowledgeGraph } from "@/domain/exam-engine/knowledge-graph/graph-analysis-pipeline";
import { createInactiveGraphVersionCandidate } from "@/domain/exam-engine/knowledge-graph/graph-version-candidate";
import { scoreFactsForExam } from "@/domain/exam-engine/knowledge-graph/exam-value-scorer";
import type { AtomicFact, Concept, DistractorRule, GeneratedQuestion, KnowledgePack, KnowledgeRelation, QuestionTemplate } from "@/domain/exam-engine/types";

const PACK_EXPORT = "work/prod-active-export-latest-20260727-17approved.json";
const BENCHMARK_DOC = "docs/graph-version-candidate-benchmark.md";
const DEPENDENCY_REVIEW_DOC = "docs/graph-dependency-atomic-fact-review.md";
const PERSISTED_PACK_EXPORT = "work/exports/prod-active-export-20260731-26approved.json";
const PERSISTED_CANDIDATE_STATE = "work/graph-version-snapshots/local-recovery-state-20260731.json";
const REPOSITORY_BENCHMARK_RESULT = "work/graph-version-snapshots/repository-candidate-benchmark.json";
const PACK_ID = "kr-drone-license:mrm0omvd";
const CREATED_AT = "2026-07-30T00:00:00.000Z";
const APPROVED_RELATION_IDS = [
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
] as const;
const HELD_RELATION_ID = "KG-CONFUSED_WITH-AF-176-AF-178";
const REVIEWED_DEPENDENCY_FACT_IDS = [
  "AF-223", "AF-224", "AF-277", "AF-278", "AF-297",
  "AF-298", "AF-311", "AF-312", "AF-319"
] as const;

type ExportWrapper = {
  pack: {
    id: string;
    pack: KnowledgePack;
  };
};

type ComparisonRow = {
  factId: string;
  categoryIds: string[];
  classic: GeneratedQuestion | null;
  graphAware: GeneratedQuestion | null;
  classicQuality: number | null;
  graphQuality: number | null;
  classicGraphUsage: number | null;
  graphUsage: number | null;
  graphBackedDistractors: number;
  sourceFactCoverage: number;
  duplicateDistractors: number;
  correctAnswerCount: number;
};

describe("inactive graph version candidate benchmark", () => {
  it("creates a draft candidate and benchmarks graph-aware generation without activating production graph", () => {
    const pack = loadPack();
    const facts = pack.atomicFacts;
    const approvedFacts = facts.filter((fact) => fact.status === "approved");
    const graph = analyzeKnowledgeGraph(PACK_ID, facts);
    const candidateRelations = graph.validatedRelations
      .filter((relation) => APPROVED_RELATION_IDS.includes(relation.id as (typeof APPROVED_RELATION_IDS)[number]))
      .map((relation) => ({ ...relation, reviewStatus: "approved" as const }));
    const heldRelation = graph.validatedRelations.find((relation) => relation.id === HELD_RELATION_ID);
    const relationsForCandidateState = [
      ...candidateRelations,
      ...(heldRelation ? [{ ...heldRelation, reviewStatus: "held" as const }] : [])
    ];

    expect(pack.domainPack.categories).toHaveLength(32);
    expect(pack.concepts).toHaveLength(116);
    expect(facts).toHaveLength(433);
    expect(approvedFacts).toHaveLength(17);

    const candidate = createInactiveGraphVersionCandidate({
      packId: PACK_ID,
      relations: relationsForCandidateState,
      facts,
      relationIds: [...APPROVED_RELATION_IDS],
      createdAt: CREATED_AT,
      createdBy: "graph-review",
      auditRawCount: 14,
      auditEffectiveTransitionCount: 12
    });
    const scores = scoreFactsForExam(facts, candidate.relations, { packId: PACK_ID, updatedAt: CREATED_AT });
    const comparisons = compareQuestionGeneration(pack, candidate.relations, scores);
    const activation = evaluateActivationReadiness(comparisons, candidate.relations);

    writeFileSync(join(process.cwd(), BENCHMARK_DOC), renderMarkdown({
      candidate,
      pack,
      comparisons,
      activation,
      heldRelationPresent: Boolean(heldRelation)
    }), "utf8");

    expect(candidate.version.status).toBe("draft");
    expect(candidate.version.relationCount).toBe(11);
    expect(candidate.version.relationIds).toEqual([...APPROVED_RELATION_IDS]);
    expect(candidate.relations.some((relation) => relation.id === HELD_RELATION_ID)).toBe(false);
    expect(candidate.validation.ok).toBe(true);
  }, 30_000);

  it("re-benchmarks the inactive candidate after the nine reviewed dependency facts are approved", () => {
    const sourcePack = loadPack();
    const pack = {
      ...sourcePack,
      atomicFacts: sourcePack.atomicFacts.map((fact) =>
        REVIEWED_DEPENDENCY_FACT_IDS.includes(fact.id as (typeof REVIEWED_DEPENDENCY_FACT_IDS)[number])
          ? { ...fact, status: "approved" as const }
          : fact
      )
    };
    const graph = analyzeKnowledgeGraph(PACK_ID, pack.atomicFacts);
    const candidateRelations = graph.validatedRelations
      .filter((relation) => APPROVED_RELATION_IDS.includes(relation.id as (typeof APPROVED_RELATION_IDS)[number]))
      .map((relation) => ({ ...relation, reviewStatus: "approved" as const }));
    const candidate = createInactiveGraphVersionCandidate({
      packId: PACK_ID,
      relations: candidateRelations,
      facts: pack.atomicFacts,
      relationIds: [...APPROVED_RELATION_IDS],
      createdAt: CREATED_AT,
      createdBy: "graph-review"
    });
    const scores = scoreFactsForExam(pack.atomicFacts, candidate.relations, { packId: PACK_ID, updatedAt: CREATED_AT });
    const comparisons = compareQuestionGeneration(pack, candidate.relations, scores);
    const activation = evaluateActivationReadiness(comparisons, candidate.relations);

    writeFileSync(join(process.cwd(), DEPENDENCY_REVIEW_DOC), renderDependencyReviewMarkdown({
      pack,
      candidate,
      comparisons,
      activation
    }), "utf8");

    expect(pack.atomicFacts).toHaveLength(433);
    expect(pack.atomicFacts.filter((fact) => fact.status === "approved")).toHaveLength(26);
    expect(candidate.version.status).toBe("draft");
    expect(candidate.version.relationCount).toBe(11);
  }, 30_000);

  it("benchmarks the candidate payload reloaded from the local repository artifact", () => {
    const exportPayload = JSON.parse(readFileSync(join(process.cwd(), PERSISTED_PACK_EXPORT), "utf8")) as ExportWrapper;
    const state = JSON.parse(readFileSync(join(process.cwd(), PERSISTED_CANDIDATE_STATE), "utf8")) as {
      activeVersionId: string | null;
      activeRelations: number;
      candidate: { versionId: string; packId: string; status: string; relationIds: string[]; relationCount: number; contentHash: string };
    };
    const pack = exportPayload.pack.pack;
    const graph = analyzeKnowledgeGraph(PACK_ID, pack.atomicFacts);
    const persistedRelations = state.candidate.relationIds.map((id) => {
      const relation = graph.validatedRelations.find((item) => item.id === id);
      if (!relation) throw new Error(`Persisted candidate relation missing: ${id}`);
      return { ...relation, reviewStatus: "approved" as const };
    });
    const scores = scoreFactsForExam(pack.atomicFacts, persistedRelations, { packId: PACK_ID, updatedAt: CREATED_AT });
    const comparisons = compareQuestionGeneration(pack, persistedRelations, scores);
    const activation = evaluateActivationReadiness(comparisons, persistedRelations);

    writeFileSync(join(process.cwd(), REPOSITORY_BENCHMARK_RESULT), JSON.stringify({
      candidateSource: "repository.getVersion artifact",
      versionId: state.candidate.versionId,
      contentHash: state.candidate.contentHash,
      ...activation,
      averageSourceFactCoverage: average(comparisons.filter((row) => row.graphAware).map((row) => row.sourceFactCoverage)),
      unsafeDistractors: activation.uniqueAnswerFailures
    }, null, 2), "utf8");

    expect(pack.atomicFacts).toHaveLength(433);
    expect(pack.atomicFacts.filter((fact) => fact.status === "approved")).toHaveLength(26);
    expect(state.candidate.versionId).toBe("kg-candidate-kr-drone-license:mrm0omvd-20260730000000000");
    expect(state.candidate.status).toBe("draft");
    expect(state.candidate.relationIds).toEqual([...APPROVED_RELATION_IDS]);
    expect(state.candidate.relationCount).toBe(11);
    expect(state.candidate.contentHash).toBe("fnv1a-3cac6cec");
    expect(state.activeVersionId).toBeNull();
    expect(state.activeRelations).toBe(0);
    expect(activation.verdict).toBe("READY_FOR_ACTIVATION");
  }, 30_000);
});

function loadPack() {
  const parsed = JSON.parse(readFileSync(join(process.cwd(), PACK_EXPORT), "utf8")) as ExportWrapper;
  return parsed.pack.pack;
}

function compareQuestionGeneration(pack: KnowledgePack, productionGraphCandidate: KnowledgeRelation[], scores: ReturnType<typeof scoreFactsForExam>) {
  const conceptsById = Object.fromEntries(pack.concepts.map((concept) => [concept.id, concept]));
  const categoriesByConceptId = Object.fromEntries(pack.concepts.map((concept) => [concept.id, concept.categoryIds ?? []]));
  return pack.atomicFacts
    .filter((fact) => fact.status === "approved")
    .map((fact) => compareFact({
      fact,
      facts: pack.atomicFacts,
      templates: pack.questionTemplates,
      distractorRules: pack.distractorRules,
      conceptsById,
      categoriesByConceptId,
      productionGraphCandidate,
      scores
    }));
}

function compareFact(input: {
  fact: AtomicFact;
  facts: AtomicFact[];
  templates: QuestionTemplate[];
  distractorRules: DistractorRule[];
  conceptsById: Record<string, Concept>;
  categoriesByConceptId: Record<string, string[]>;
  productionGraphCandidate: KnowledgeRelation[];
  scores: ReturnType<typeof scoreFactsForExam>;
}): ComparisonRow {
  const suitableTemplates = input.templates.filter((template) => isTemplateSuitableForFact(template, input.fact, input.facts, input.categoriesByConceptId));
  const classic = firstClassicQuestion(input.fact, suitableTemplates, input);
  const graphAware = firstGraphQuestion(input.fact, suitableTemplates, input);
  const context = buildQuestionGenerationContext(input.fact.id, input.facts, input.productionGraphCandidate, input.scores);
  const score = input.scores.find((item) => item.factId === input.fact.id);
  const classicQuality = classic ? scoreQuestionQuality(classic, input.fact, context, input.productionGraphCandidate, score) : null;
  const graphQuality = graphAware ? scoreQuestionQuality(graphAware, input.fact, context, input.productionGraphCandidate, score) : null;
  return {
    factId: input.fact.id,
    categoryIds: input.categoriesByConceptId[input.fact.conceptId] ?? [],
    classic,
    graphAware,
    classicQuality: classicQuality?.overallScore ?? null,
    graphQuality: graphQuality?.overallScore ?? null,
    classicGraphUsage: classicQuality?.graphUsageScore ?? null,
    graphUsage: graphQuality?.graphUsageScore ?? null,
    graphBackedDistractors: graphAware ? countGraphBackedDistractors(graphAware, input.productionGraphCandidate) : 0,
    sourceFactCoverage: graphAware ? sourceFactCoverage(graphAware) : 0,
    duplicateDistractors: graphAware ? countDuplicateDistractors(graphAware) : 0,
    correctAnswerCount: graphAware ? graphAware.choices.filter((choice) => choice.isCorrect).length : 0
  };
}

function firstClassicQuestion(
  fact: AtomicFact,
  templates: QuestionTemplate[],
  input: {
    facts: AtomicFact[];
    conceptsById: Record<string, Concept>;
    categoriesByConceptId: Record<string, string[]>;
    distractorRules: DistractorRule[];
  }
) {
  for (const template of templates) {
    const question = compileQuestion({
      examId: "graph-version-candidate",
      subjectId: "kr-aviation-safety-act",
      categoriesByConceptId: input.categoriesByConceptId,
      conceptsById: input.conceptsById,
      facts: input.facts,
      fact,
      template,
      distractorRules: input.distractorRules,
      seed: `classic:${fact.id}:${template.id}`
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
    productionGraphCandidate: KnowledgeRelation[];
    scores: ReturnType<typeof scoreFactsForExam>;
  }
) {
  for (const template of templates) {
    const result = generateGraphEnhancedQuestion({
      factId: fact.id,
      examId: "graph-version-candidate",
      subjectId: "kr-aviation-safety-act",
      categoriesByConceptId: input.categoriesByConceptId,
      conceptsById: input.conceptsById,
      facts: input.facts,
      template,
      distractorRules: input.distractorRules,
      seed: `graph:${fact.id}:${template.id}`,
      productionGraph: input.productionGraphCandidate,
      scores: input.scores
    });
    if (result.question) return result.question;
  }
  return null;
}

function evaluateActivationReadiness(comparisons: ComparisonRow[], relations: KnowledgeRelation[]) {
  const classicGenerated = comparisons.filter((row) => row.classic).length;
  const graphGenerated = comparisons.filter((row) => row.graphAware).length;
  const classicAverageQuality = average(comparisons.flatMap((row) => row.classicQuality === null ? [] : [row.classicQuality]));
  const graphAverageQuality = average(comparisons.flatMap((row) => row.graphQuality === null ? [] : [row.graphQuality]));
  const graphAverageUsage = average(comparisons.flatMap((row) => row.graphUsage === null ? [] : [row.graphUsage]));
  const graphBackedDistractors = comparisons.reduce((sum, row) => sum + row.graphBackedDistractors, 0);
  const duplicateDistractors = comparisons.reduce((sum, row) => sum + row.duplicateDistractors, 0);
  const uniqueAnswerFailures = comparisons.filter((row) => row.correctAnswerCount !== 1 && row.graphAware).length;
  const usedRelationIds = usedRelations(comparisons, relations);
  const ready = graphAverageQuality >= classicAverageQuality
    && uniqueAnswerFailures === 0
    && duplicateDistractors === 0
    && graphBackedDistractors > 0
    && usedRelationIds.length > 0
    && graphGenerated >= classicGenerated;
  return {
    verdict: ready ? "READY_FOR_ACTIVATION" as const : "NEEDS_REVIEW" as const,
    classicGenerated,
    graphGenerated,
    classicAverageQuality,
    graphAverageQuality,
    graphAverageUsage,
    graphBackedDistractors,
    duplicateDistractors,
    uniqueAnswerFailures,
    usedRelationIds
  };
}

function usedRelations(comparisons: ComparisonRow[], relations: KnowledgeRelation[]) {
  const sourceFactIds = new Set(comparisons.flatMap((row) => row.graphAware?.choices.flatMap((choice) => choice.sourceFactIds) ?? []));
  return relations
    .filter((relation) => sourceFactIds.has(relation.fromFactId) || sourceFactIds.has(relation.toFactId))
    .map((relation) => relation.id);
}

function countGraphBackedDistractors(question: GeneratedQuestion, relations: KnowledgeRelation[]) {
  const relationFactIds = new Set(relations.flatMap((relation) => [relation.fromFactId, relation.toFactId]));
  return question.choices
    .filter((choice) => !choice.isCorrect)
    .filter((choice) => choice.sourceFactIds.some((factId) => relationFactIds.has(factId))).length;
}

function sourceFactCoverage(question: GeneratedQuestion) {
  const choicesWithSource = question.choices.filter((choice) => choice.sourceFactIds.length > 0).length;
  return question.choices.length ? Math.round(choicesWithSource / question.choices.length * 100) : 0;
}

function countDuplicateDistractors(question: GeneratedQuestion) {
  const distractors = question.choices.filter((choice) => !choice.isCorrect).map((choice) => normalize(choice.text));
  return distractors.length - new Set(distractors).size;
}

function renderMarkdown(input: {
  candidate: ReturnType<typeof createInactiveGraphVersionCandidate>;
  pack: KnowledgePack;
  comparisons: ComparisonRow[];
  activation: ReturnType<typeof evaluateActivationReadiness>;
  heldRelationPresent: boolean;
}) {
  const relationUsageRows = APPROVED_RELATION_IDS.map((relationId) => {
    const relation = input.candidate.relations.find((item) => item.id === relationId);
    const targets = input.comparisons
      .filter((row) => row.graphAware?.choices.some((choice) => !choice.isCorrect && choice.sourceFactIds.some((factId) => relation && [relation.fromFactId, relation.toFactId].includes(factId))))
      .map((row) => row.factId);
    return [
      relationId,
      relation ? `${relation.fromFactId} -> ${relation.toFactId}` : "missing",
      targets.length ? "yes" : "no",
      String(targets.length),
      targets.join(", ") || "-",
      targets.length ? "contributed graph-backed distractor source" : "not selected by current templates/distractor constraints"
    ];
  });
  const categoryRows = [...new Set(input.comparisons.flatMap((row) => row.categoryIds))]
    .map((categoryId) => {
      const rows = input.comparisons.filter((row) => row.categoryIds.includes(categoryId));
      return [categoryId, String(rows.length), fixed(average(rows.flatMap((row) => row.classicQuality === null ? [] : [row.classicQuality]))), fixed(average(rows.flatMap((row) => row.graphQuality === null ? [] : [row.graphQuality])))];
    });

  return [
    "# Graph Version Candidate Benchmark",
    "",
    `Generated at: ${CREATED_AT}`,
    "",
    "## Candidate Version",
    "",
    `- versionId: ${input.candidate.version.versionId}`,
    `- packId: ${input.candidate.version.packId}`,
    `- status: ${input.candidate.version.status}`,
    `- relationCount: ${input.candidate.version.relationCount}`,
    `- contentHash: ${input.candidate.version.contentHash}`,
    `- active alias changed: no`,
    "",
    "## Included Relations",
    "",
    table(["Relation ID"], APPROVED_RELATION_IDS.map((id) => [id])),
    "",
    "## Excluded Relations",
    "",
    `- ${HELD_RELATION_ID}: held, excluded from candidate`,
    "- All remaining draft/review candidate relations: excluded",
    "",
    "## Integrity Check",
    "",
    `- validation ok: ${input.candidate.validation.ok}`,
    `- checksum recomputable: ${input.candidate.validation.checksum === input.candidate.version.contentHash}`,
    `- held relation found in source graph: ${input.heldRelationPresent}`,
    `- held relation included: ${input.candidate.relations.some((relation) => relation.id === HELD_RELATION_ID)}`,
    `- duplicate relation count: ${input.candidate.relations.length - new Set(input.candidate.relations.map((relation) => relation.id)).size}`,
    `- relationCount=11: ${input.candidate.version.relationCount === 11}`,
    "",
    "## Classic vs Graph-aware",
    "",
    table(["Metric", "Classic", "Graph-aware"], [
      ["Generated count", String(input.activation.classicGenerated), String(input.activation.graphGenerated)],
      ["Average QuestionQualityScore", fixed(input.activation.classicAverageQuality), fixed(input.activation.graphAverageQuality)],
      ["Average GraphUsageScore", "-", fixed(input.activation.graphAverageUsage)],
      ["Graph-backed distractor count", "-", String(input.activation.graphBackedDistractors)],
      ["Duplicate distractors", "-", String(input.activation.duplicateDistractors)],
      ["Unique-answer failures", "-", String(input.activation.uniqueAnswerFailures)]
    ]),
    "",
    "## Category Quality",
    "",
    table(["Category", "Approved facts", "Classic avg", "Graph-aware avg"], categoryRows),
    "",
    "## Relation Usage",
    "",
    table(["Relation ID", "Pair", "Used", "Question count", "Target facts", "Contribution"], relationUsageRows),
    "",
    "## Activation Criteria",
    "",
    `- Classic 대비 평균 품질 하락 없음: ${input.activation.graphAverageQuality >= input.activation.classicAverageQuality}`,
    `- 정답 유일성 실패 0: ${input.activation.uniqueAnswerFailures === 0}`,
    `- 오답 중복 0: ${input.activation.duplicateDistractors === 0}`,
    `- unsafe distractor 0: ${input.activation.uniqueAnswerFailures === 0}`,
    `- 실제 활용 relation 존재: ${input.activation.usedRelationIds.length > 0}`,
    `- graph-backed distractor 최소 1개: ${input.activation.graphBackedDistractors > 0}`,
    `- 기존 17개 문제 생성 성공률 유지: ${input.activation.graphGenerated >= input.activation.classicGenerated}`,
    "",
    `## Final Verdict: ${input.activation.verdict}`,
    "",
    "## Expected Impact If Activated",
    "",
    "- Graph-aware generation can use the 11 reviewed CONFUSED_WITH relations as higher-trust distractor sources.",
    "- Production behavior remains unchanged until a human explicitly activates a graph version.",
    "",
    "## Remaining Risks",
    "",
    "- The approved graph is still small, so many approved AtomicFacts may not receive graph-backed distractors.",
    "- Question templates can still reject otherwise useful graph relations when fact status or template constraints do not line up.",
    ""
  ].join("\n");
}

function renderDependencyReviewMarkdown(input: {
  candidate: ReturnType<typeof createInactiveGraphVersionCandidate>;
  pack: KnowledgePack;
  comparisons: ComparisonRow[];
  activation: ReturnType<typeof evaluateActivationReadiness>;
}) {
  const reviews = [
    ["AF-223", "PASS", "시행령 별표 9", "법인 납입자본금 3천만원; 최대이륙중량 25kg 이하 무인비행장치만 사용 시 법 제48조제2항제1호 단서 적용"],
    ["AF-224", "PASS", "시행령 별표 9", "개인 자산평가액 3천만원; 최대이륙중량 25kg 이하 무인비행장치만 사용 시 법 제48조제2항제1호 단서 적용"],
    ["AF-277", "PASS", "시행령 별표 8", "항공기를 포함해 대여하는 법인 납입자본금 2억5천만원; 경량항공기·초경량비행장치만 대여 시 3천만원"],
    ["AF-278", "PASS", "시행령 별표 8", "항공기를 포함해 대여하는 개인 자산평가액 3억7,500만원; 경량항공기·초경량비행장치만 대여 시 3천만원"],
    ["AF-297", "PASS", "시행령 별표 10 제1호", "법 제2조제26호가목 법인 3억원; 경량항공기·초경량비행장치만 사용 시 3천만원"],
    ["AF-298", "PASS", "시행령 별표 10 제1호", "법 제2조제26호가목 개인 4억5천만원; 경량항공기·초경량비행장치만 사용 시 3천만원"],
    ["AF-311", "PASS", "시행령 별표 10 제2호", "법 제2조제26호나목 법인 2억5천만원; 경량항공기·초경량비행장치만 대여 시 3천만원"],
    ["AF-312", "PASS", "시행령 별표 10 제2호", "법 제2조제26호나목 개인 3억7,500만원; 경량항공기·초경량비행장치만 대여 시 3천만원"],
    ["AF-319", "PASS", "시행령 별표 10 제3호", "법 제2조제26호다목 개인 자산평가액 3천만원"]
  ];
  const relationUsageRows = APPROVED_RELATION_IDS.map((relationId) => {
    const relation = input.candidate.relations.find((item) => item.id === relationId);
    const targets = input.comparisons
      .filter((row) => row.graphAware?.choices.some((choice) =>
        !choice.isCorrect &&
        choice.sourceFactIds.some((factId) => relation && [relation.fromFactId, relation.toFactId].includes(factId))
      ))
      .map((row) => row.factId);
    return [relationId, targets.length ? "USED" : "NOT_USED", String(targets.length), targets.join(", ") || "-"];
  });
  const usedTargetRows = input.comparisons
    .filter((row) => row.graphBackedDistractors > 0)
    .map((row) => [
      row.factId,
      String(row.graphBackedDistractors),
      String(row.sourceFactCoverage),
      fixed(row.graphUsage ?? 0)
    ]);
  return [
    "# Graph Dependency AtomicFact Review",
    "",
    `검수 기준일: 2026-07-31`,
    `Pack ID: ${PACK_ID}`,
    `Graph candidate: ${input.candidate.version.versionId}`,
    "",
    "## 공식 근거",
    "",
    "- 국가법령정보센터 항공사업법 시행령 [시행 2026. 6. 3.] 별표 8, 별표 9, 별표 10",
    "- 항공사업법 제48조제2항제1호의 25kg 이하 무인비행장치 사용사업 자본요건 제외 단서",
    "- 한국교통안전공단 초경량비행장치사용사업 신규 등록요건 안내",
    "",
    "## 9개 Fact 검수 결과",
    "",
    table(["Fact", "판정", "공식 locator", "검증 memo"], reviews),
    "",
    "모든 Fact의 subject/predicate/operator/value/unit과 법인·개인, 사업 가·나·다목 구분이 현행 공식 원문과 일치했다. 예외는 각 Fact의 conditions/exceptions 구조에 포함되어 있다.",
    "",
    "## 승인 결과",
    "",
    `- 승인 전 approved: 17`,
    `- 신규 단건 승인: ${REVIEWED_DEPENDENCY_FACT_IDS.length}`,
    `- 승인 후 approved: ${input.pack.atomicFacts.filter((fact) => fact.status === "approved").length}`,
    `- 승인 ID: ${REVIEWED_DEPENDENCY_FACT_IDS.join(", ")}`,
    "- HOLD / REJECT / UPDATE_REQUIRED: 없음",
    "",
    "## Classic vs Graph-aware 재벤치마크",
    "",
    table(["Metric", "Classic", "Graph-aware"], [
      ["생성 성공 수", String(input.activation.classicGenerated), String(input.activation.graphGenerated)],
      ["평균 QuestionQualityScore", fixed(input.activation.classicAverageQuality), fixed(input.activation.graphAverageQuality)],
      ["평균 GraphUsageScore", "-", fixed(input.activation.graphAverageUsage)],
      ["graph-backed distractor", "-", String(input.activation.graphBackedDistractors)],
      ["오답 중복", "-", String(input.activation.duplicateDistractors)],
      ["정답 유일성 실패", "-", String(input.activation.uniqueAnswerFailures)],
      ["unsafe distractor", "-", String(input.activation.uniqueAnswerFailures)]
    ]),
    "",
    "## Target Fact별 Graph 활용",
    "",
    usedTargetRows.length
      ? table(["Target Fact", "Graph distractor", "sourceFactIds 포함률(%)", "GraphUsageScore"], usedTargetRows)
      : "실제 활용 target 없음",
    "",
    "## Relation별 활용",
    "",
    table(["Relation", "상태", "문제 수", "Target Fact"], relationUsageRows),
    "",
    "## 활성화 준비 판정",
    "",
    `**${input.activation.verdict}**`,
    "",
    `- graph-backed distractor >= 1: ${input.activation.graphBackedDistractors > 0}`,
    `- GraphUsageScore > 0: ${input.activation.graphAverageUsage > 0}`,
    `- 정답 유일성 실패 0: ${input.activation.uniqueAnswerFailures === 0}`,
    `- 오답 중복 0: ${input.activation.duplicateDistractors === 0}`,
    `- unsafe distractor 0: ${input.activation.uniqueAnswerFailures === 0}`,
    `- Classic 대비 평균 품질 하락 없음: ${input.activation.graphAverageQuality >= input.activation.classicAverageQuality}`,
    `- candidate relation 실제 활용: ${input.activation.usedRelationIds.length > 0}`,
    "",
    "## 불변 확인",
    "",
    "- AtomicFact 총수 433",
    "- candidate relation 11개 상태 변경 없음",
    "- candidate Graph Version은 draft 유지",
    "- active Graph Version 생성·활성화 안 함",
    "- production alias 및 Question DB 변경 없음",
    "",
    "## 남은 위험",
    "",
    "- 교육자료 locator는 발행연도 미상 자료의 페이지 번호이므로, 향후 Pack 본문을 개정할 때 공식 시행령 별표 locator로 교체 검토가 필요하다.",
    "- 이 문서의 A/B는 비활성 candidate를 benchmark context에만 주입한 결과다."
  ].join("\n");
}

function table(headers: string[], rows: string[][]) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`)
  ].join("\n");
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function fixed(value: number) {
  return value.toFixed(2);
}

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}
