"use client";

import { useEffect, useState } from "react";
import { compileQuestion, isTemplateSuitableForFact } from "@/domain/exam-engine/compiler/question-compiler";
import { scoreQuestionQuality } from "@/domain/exam-engine/evaluation/question-quality-scorer";
import { generateGraphEnhancedQuestion } from "@/domain/exam-engine/generation/graph-enhanced-question-generator";
import { buildQuestionGenerationContext } from "@/domain/exam-engine/generation/question-generation-context-builder";
import {
  activateGraphVersionCandidate,
  createRollbackDryRun,
  rollbackActiveGraphVersion,
  validateGraphVersionActivation
} from "@/domain/exam-engine/knowledge-graph/graph-version-activation-browser-service";
import {
  createLocalKnowledgeGraphPersistenceRepository,
  KNOWLEDGE_GRAPH_APPROVALS_KEY,
  KNOWLEDGE_GRAPH_RELATIONS_KEY,
  KNOWLEDGE_GRAPH_REVIEW_AUDIT_KEY,
  KNOWLEDGE_GRAPH_VERSION_AUDIT_KEY,
  KNOWLEDGE_GRAPH_VERSIONS_KEY
} from "@/domain/exam-engine/knowledge-graph/local-knowledge-graph-repository";
import { scoreFactsForExam } from "@/domain/exam-engine/knowledge-graph/exam-value-scorer";
import {
  ACTIVE_PACK_CACHE_KEY,
  createLocalKnowledgePackRepository,
  KNOWLEDGE_PACK_CACHE_KEY
} from "@/domain/exam-engine/import/local-knowledge-pack-repository";
import type { Concept, AtomicFact } from "@/domain/exam-engine/types/knowledge";
import type { KnowledgePack } from "@/domain/exam-engine/types/knowledge-pack";
import type { GeneratedQuestion } from "@/domain/exam-engine/types/question";
import type { DistractorRule, QuestionTemplate } from "@/domain/exam-engine/types/template";
import type { KnowledgeRelation } from "@/domain/exam-engine/types/knowledge-graph";
import {
  canRunGraphActivation,
  graphActivationFailed,
  graphActivationStep,
  graphActivationSucceeded,
  INITIAL_GRAPH_ACTIVATION_VIEW_STATE,
  normalizeActivationError,
  startGraphActivationClick,
  type GraphActivationPreflight,
  type GraphActivationStep
} from "./graph-activation-view-state";

const PACK_ID = "kr-drone-license:mrm0omvd";
const VERSION_ID = "kg-candidate-kr-drone-license:mrm0omvd-20260730000000000";
const CONTENT_HASH = "fnv1a-3cac6cec";
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
];
const STORAGE_KEYS = [
  KNOWLEDGE_PACK_CACHE_KEY,
  ACTIVE_PACK_CACHE_KEY,
  KNOWLEDGE_GRAPH_RELATIONS_KEY,
  KNOWLEDGE_GRAPH_VERSIONS_KEY,
  KNOWLEDGE_GRAPH_APPROVALS_KEY,
  KNOWLEDGE_GRAPH_REVIEW_AUDIT_KEY,
  KNOWLEDGE_GRAPH_VERSION_AUDIT_KEY
];
const ACTIVATION_REASON = "READY_FOR_ACTIVATION repository benchmark passed";

type StateSummary = {
  origin: string;
  packId: string | null;
  atomicFacts: number;
  approvedFacts: number;
  approvedRelations: number;
  heldRelations: number;
  activeVersionId: string | null;
  activeRelations: number;
  candidateStatus: string | null;
  candidateRelationCount: number | null;
  candidateContentHash: string | null;
  versionAuditCount: number;
};

type BenchmarkSummary = {
  classicGenerated: number;
  graphGenerated: number;
  classicAverageQuality: number;
  graphAverageQuality: number;
  graphAverageUsage: number;
  graphBackedDistractors: number;
  relationUsageCount: number;
  averageSourceFactCoverage: number;
  duplicateDistractors: number;
  uniqueAnswerFailures: number;
  unsafeDistractors: number;
  verdict: "PASS" | "FAIL";
};

type ActivationReport = {
  beforeSnapshotPath: string;
  activationAuditId: string | null;
  rollbackAuditId: string | null;
  reactivationAuditId: string | null;
  activationBenchmark: BenchmarkSummary;
  rollbackBenchmark: BenchmarkSummary;
  finalBenchmark: BenchmarkSummary;
  rollbackDryRun: ReturnType<typeof createRollbackDryRun>;
  finalState: StateSummary;
};

async function saveArtifact(fileName: string, payload: unknown) {
  const response = await fetch("/api/admin/local-recovery-artifact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ fileName, payload })
  });
  const parsed = await response.json();
  if (!response.ok) throw new Error(parsed.error ?? "Artifact save failed.");
  return parsed as { path: string };
}

function readStorageSnapshot() {
  return Object.fromEntries(STORAGE_KEYS.map((key) => [key, window.localStorage.getItem(key)]));
}

function restoreStorageSnapshot(snapshot: Record<string, string | null>) {
  for (const key of STORAGE_KEYS) {
    const value = snapshot[key];
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  }
}

export default function GraphActivationClient() {
  const [state, setState] = useState<StateSummary | null>(null);
  const [report, setReport] = useState<ActivationReport | null>(null);
  const [message, setMessage] = useState("Ready. Import boundary clean.");
  const [viewState, setViewState] = useState(INITIAL_GRAPH_ACTIVATION_VIEW_STATE);

  async function loadState() {
    const summary = await getStateSummary();
    setState(summary);
    return summary;
  }

  useEffect(() => {
    void loadState().catch((error) => setMessage(error instanceof Error ? error.message : "Load failed."));
  }, []);

  function setStep(currentStep: GraphActivationStep) {
    setViewState((previous) => graphActivationStep(previous, currentStep));
  }

  async function handleRunPreflight() {
    if (viewState.isRunning) return;
    const clickedAt = new Date().toISOString();
    setViewState(startGraphActivationClick(clickedAt));
    setMessage("Click received. Running preflight.");
    try {
      setStep("PRECHECK_RUNNING");
      const preflight = await runPreflight();
      await loadState();
      if (!preflight.ok) throw new PreflightError(preflight);
      setViewState((previous) => graphActivationSucceeded(previous, "Preflight PASS. Activate & Verify is enabled.", preflight));
      setMessage("Preflight PASS. Activate & Verify is enabled.");
    } catch (error) {
      console.error(error);
      const preflight = error instanceof PreflightError ? error.preflight : undefined;
      setViewState((previous) => graphActivationFailed(previous, error, preflight));
      setMessage(`FAILED: ${normalizeActivationError(error)}`);
    }
  }

  async function runActivationRoundTrip() {
    if (viewState.isRunning || !canRunGraphActivation(viewState.preflight)) return;
    const clickedAt = new Date().toISOString();
    setViewState((previous) => ({
      ...startGraphActivationClick(clickedAt),
      preflight: previous.preflight
    }));
    setMessage("Click received. Activating.");
    const rawSnapshot = readStorageSnapshot();
    try {
      setStep("PRECHECK_RUNNING");
      const preflight = await runPreflight();
      if (!preflight.ok) throw new PreflightError(preflight);
      const packRepository = createLocalKnowledgePackRepository();
      const graphRepository = createLocalKnowledgeGraphPersistenceRepository();
      const active = await packRepository.getActive();
      if (!active || active.id !== PACK_ID) throw new Error("Active pack mismatch after preflight.");

      const beforeSummary = await getStateSummary();
      setStep("ACTIVATING");
      const beforeArtifact = await saveArtifact(`graph-activation-before-${Date.now()}.json`, {
        summary: beforeSummary,
        localStorage: rawSnapshot,
        approvedFactIds: active.pack.atomicFacts.filter((fact) => fact.status === "approved").map((fact) => fact.id),
        candidate: await graphRepository.getVersion(VERSION_ID)
      });

      const activation = await activateGraphVersionCandidate(graphRepository, {
        packId: PACK_ID,
        versionId: VERSION_ID,
        facts: active.pack.atomicFacts,
        reviewerId: "local-admin",
        reason: ACTIVATION_REASON,
        relationIds: APPROVED_RELATION_IDS,
        expectedContentHash: CONTENT_HASH,
        expectedApprovedFactCount: 26
      });
      const activationState = await assertActiveState();
      setStep("BENCHMARK_RUNNING");
      const activationBenchmark = await runRuntimeBenchmark(active.pack);
      assertPassingBenchmark(activationBenchmark);

      const rollbackDryRun = createRollbackDryRun({
        versionId: VERSION_ID,
        relationCount: activationState.activeRelations,
        previousActiveVersionId: activationState.activeVersionId
      });
      setStep("ROLLING_BACK");
      const rollback = await rollbackActiveGraphVersion(graphRepository, {
        packId: PACK_ID,
        versionId: VERSION_ID,
        reviewerId: "local-admin",
        reason: "Rollback round-trip verification."
      });
      const rollbackState = await getStateSummary();
      if (rollbackState.activeVersionId !== null || rollbackState.activeRelations !== 0 || rollbackState.candidateStatus !== "draft") {
        throw new Error("Rollback state mismatch.");
      }
      const rollbackBenchmark = await runRuntimeBenchmark(active.pack);
      if (rollbackBenchmark.graphAverageUsage !== 0 || rollbackBenchmark.graphBackedDistractors !== 0) {
        throw new Error("Rollback benchmark still uses graph.");
      }

      setStep("REACTIVATING");
      const reactivation = await activateGraphVersionCandidate(graphRepository, {
        packId: PACK_ID,
        versionId: VERSION_ID,
        facts: active.pack.atomicFacts,
        reviewerId: "local-admin",
        reason: ACTIVATION_REASON,
        relationIds: APPROVED_RELATION_IDS,
        expectedContentHash: CONTENT_HASH,
        expectedApprovedFactCount: 26
      });
      const finalState = await assertActiveState();
      setStep("BENCHMARK_RUNNING");
      const finalBenchmark = await runRuntimeBenchmark(active.pack);
      assertPassingBenchmark(finalBenchmark);

      const nextReport = {
        beforeSnapshotPath: beforeArtifact.path,
        activationAuditId: activation.audit?.auditId ?? null,
        rollbackAuditId: rollback.audit?.auditId ?? null,
        reactivationAuditId: reactivation.audit?.auditId ?? null,
        activationBenchmark,
        rollbackBenchmark,
        finalBenchmark,
        rollbackDryRun,
        finalState
      };
      await saveArtifact("runtime-active-graph-benchmark-20260801.json", nextReport);
      await saveArtifact("graph-activation-final-state-20260801.json", {
        ...nextReport,
        versionAudit: await graphRepository.getVersionAudit(PACK_ID)
      });
      setReport(nextReport);
      setState(finalState);
      setViewState((previous) => graphActivationSucceeded(previous, "Activation round-trip completed.", preflight));
      setMessage("Activation, runtime benchmark, rollback, and reactivation completed.");
    } catch (error) {
      console.error(error);
      restoreStorageSnapshot(rawSnapshot);
      await loadState().catch(() => undefined);
      const preflight = error instanceof PreflightError ? error.preflight : undefined;
      setViewState((previous) => graphActivationFailed(previous, error, preflight));
      setMessage(error instanceof Error ? `BLOCKED: ${error.message}` : "BLOCKED");
    }
  }

  const canActivate = canRunGraphActivation(viewState.preflight);

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-6">
      <h1 className="text-2xl font-black">Local Graph Version Activation</h1>
      <p role="status" className="rounded-lg border bg-white p-3 font-mono text-sm">{message}</p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={viewState.isRunning}
          onClick={() => void handleRunPreflight()}
          className="h-11 rounded-lg bg-sky-700 px-4 text-sm font-black text-white disabled:opacity-40"
        >
          {viewState.isRunning ? `Running: ${viewState.currentStep}...` : "Run Preflight"}
        </button>
        <button
          type="button"
          disabled={viewState.isRunning || !canActivate}
          onClick={() => void runActivationRoundTrip()}
          className="h-11 rounded-lg bg-slate-950 px-4 text-sm font-black text-white disabled:opacity-40"
        >
          {viewState.isRunning ? `Running: ${viewState.currentStep}...` : "Activate & Verify"}
        </button>
      </div>
      <section className="grid gap-4 lg:grid-cols-2">
        <pre data-testid="activation-view-state" className="overflow-auto rounded-lg bg-zinc-950 p-4 text-xs text-yellow-100">{JSON.stringify(viewState, null, 2)}</pre>
        <pre data-testid="activation-preflight" className="overflow-auto rounded-lg bg-zinc-950 p-4 text-xs text-orange-100">{JSON.stringify({
          canActivate,
          disabledReason: canActivate ? null : viewState.preflight?.reasons ?? ["Run Preflight first"]
        }, null, 2)}</pre>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <pre data-testid="state-summary" className="overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-sky-100">{JSON.stringify(state, null, 2)}</pre>
        <pre data-testid="activation-report" className="overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-emerald-100">{JSON.stringify(report, null, 2)}</pre>
      </section>
    </main>
  );
}

class PreflightError extends Error {
  constructor(public readonly preflight: GraphActivationPreflight) {
    super(`Preflight failed: ${preflight.reasons.join("; ")}`);
  }
}

async function runPreflight(): Promise<GraphActivationPreflight> {
  const checkedAt = new Date().toISOString();
  const reasons: string[] = [];
  if (typeof window === "undefined") reasons.push("WINDOW_UNAVAILABLE");
  if (typeof window !== "undefined" && window.location.origin !== "http://localhost:4450") {
    reasons.push(`Origin mismatch: ${window.location.origin}`);
  }
  if (!canReadWriteLocalStorage()) reasons.push("LOCAL_STORAGE_UNAVAILABLE");
  if (reasons.length) {
    return { ok: false, checkedAt, reasons, canActivate: false };
  }

  const packRepository = createLocalKnowledgePackRepository();
  const graphRepository = createLocalKnowledgeGraphPersistenceRepository();
  const [active, candidate, relations, activeGraph] = await Promise.all([
    packRepository.getActive(),
    graphRepository.getVersion(VERSION_ID),
    graphRepository.getRelations(PACK_ID),
    graphRepository.getActiveGraph(PACK_ID)
  ]);

  if (!active) reasons.push("Pack missing");
  if (active && active.id !== PACK_ID) reasons.push(`Pack ID mismatch: ${active.id}`);
  if (active && active.pack.atomicFacts.length !== 433) reasons.push(`AtomicFact count mismatch: ${active.pack.atomicFacts.length}`);
  if (active && active.pack.atomicFacts.filter((fact) => fact.status === "approved").length !== 26) {
    reasons.push(`approved Fact count mismatch: ${active.pack.atomicFacts.filter((fact) => fact.status === "approved").length}`);
  }
  if (!candidate) reasons.push("candidate missing");
  if (candidate && candidate.status !== "draft") reasons.push(`candidate status is ${candidate.status}, expected draft`);
  if (candidate && candidate.relationCount !== 11) reasons.push(`relation count mismatch: ${candidate.relationCount}`);
  if (candidate && candidate.contentHash !== CONTENT_HASH) reasons.push(`candidate hash mismatch: ${candidate.contentHash}`);
  if (candidate && JSON.stringify(candidate.relationIds ?? []) !== JSON.stringify(APPROVED_RELATION_IDS)) reasons.push("candidate relationIds mismatch");
  if (candidate && !candidate.benchmarkSummary) reasons.push("benchmark artifact missing");
  if (activeGraph) reasons.push(`active version already exists: ${activeGraph.versionId}`);

  const approvedRelations = relations.filter((relation) => relation.reviewStatus === "approved");
  const heldRelationIncluded = APPROVED_RELATION_IDS.some((id) => relations.find((relation) => relation.id === id)?.reviewStatus === "held");
  if (approvedRelations.length !== 11) reasons.push(`approved relation count mismatch: ${approvedRelations.length}`);
  if (heldRelationIncluded) reasons.push("held relation included");
  for (const relationId of APPROVED_RELATION_IDS) {
    const relation = relations.find((item) => item.id === relationId);
    if (!relation) reasons.push(`relation missing: ${relationId}`);
    if (relation && relation.reviewStatus !== "approved") reasons.push(`${relation.id} is ${relation.reviewStatus}`);
  }
  if (active) {
    const approvedFactIds = new Set(active.pack.atomicFacts.filter((fact) => fact.status === "approved").map((fact) => fact.id));
    for (const relationId of APPROVED_RELATION_IDS) {
      const relation = relations.find((item) => item.id === relationId);
      if (!relation) continue;
      if (!approvedFactIds.has(relation.fromFactId)) reasons.push(`${relation.id} fromFact ${relation.fromFactId} is not approved`);
      if (!approvedFactIds.has(relation.toFactId)) reasons.push(`${relation.id} toFact ${relation.toFactId} is not approved`);
    }
  }

  if (active) {
    const validation = await validateGraphVersionActivation(graphRepository, {
      packId: PACK_ID,
      versionId: VERSION_ID,
      facts: active.pack.atomicFacts,
      relationIds: APPROVED_RELATION_IDS,
      expectedContentHash: CONTENT_HASH,
      expectedApprovedFactCount: 26
    });
    reasons.push(...validation.errors);
  }

  const uniqueReasons = [...new Set(reasons)];
  return {
    ok: uniqueReasons.length === 0,
    checkedAt,
    reasons: uniqueReasons,
    canActivate: uniqueReasons.length === 0
  };
}

function canReadWriteLocalStorage() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    const key = "dronepass.graphActivation.localStorageProbe";
    window.localStorage.setItem(key, "1");
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

async function getStateSummary(): Promise<StateSummary> {
  const packRepository = createLocalKnowledgePackRepository();
  const graphRepository = createLocalKnowledgeGraphPersistenceRepository();
  const active = await packRepository.getActive();
  const packId = active?.id ?? null;
  const [relations, activeGraph, versionAudit] = packId
    ? await Promise.all([
      graphRepository.getRelations(packId),
      graphRepository.getActiveGraph(packId),
      graphRepository.getVersionAudit(packId)
    ])
    : [[], null, []] as const;
  const candidate = await graphRepository.getVersion(VERSION_ID);
  return {
    origin: window.location.origin,
    packId,
    atomicFacts: active?.pack.atomicFacts.length ?? 0,
    approvedFacts: active?.pack.atomicFacts.filter((fact) => fact.status === "approved").length ?? 0,
    approvedRelations: relations.filter((relation) => relation.reviewStatus === "approved").length,
    heldRelations: relations.filter((relation) => relation.reviewStatus === "held").length,
    activeVersionId: activeGraph?.versionId ?? null,
    activeRelations: activeGraph?.relations.length ?? 0,
    candidateStatus: candidate?.status ?? null,
    candidateRelationCount: candidate?.relationCount ?? null,
    candidateContentHash: candidate?.contentHash ?? null,
    versionAuditCount: versionAudit.length
  };
}

async function assertActiveState() {
  const state = await getStateSummary();
  if (state.packId !== PACK_ID) throw new Error("Pack ID changed.");
  if (state.atomicFacts !== 433) throw new Error("AtomicFact count changed.");
  if (state.approvedFacts !== 26) throw new Error("Approved Fact count changed.");
  if (state.approvedRelations !== 11) throw new Error("Approved relation count changed.");
  if (state.activeVersionId !== VERSION_ID) throw new Error("Active version mismatch.");
  if (state.activeRelations !== 11) throw new Error("Active relation count mismatch.");
  if (state.candidateStatus !== "active") throw new Error("Candidate status is not active.");
  if (state.candidateContentHash !== CONTENT_HASH) throw new Error("Candidate hash mismatch.");
  return state;
}

async function runRuntimeBenchmark(pack: KnowledgePack): Promise<BenchmarkSummary> {
  const graphRepository = createLocalKnowledgeGraphPersistenceRepository();
  const activeGraph = await graphRepository.getActiveGraph(PACK_ID);
  const productionGraph = activeGraph?.relations ?? [];
  const scores = scoreFactsForExam(pack.atomicFacts, productionGraph, { packId: PACK_ID, updatedAt: new Date().toISOString() });
  const comparisons = compareQuestionGeneration(pack, productionGraph, scores);
  const classicGenerated = comparisons.filter((row) => row.classic).length;
  const graphGenerated = comparisons.filter((row) => row.graphAware).length;
  const classicAverageQuality = average(comparisons.flatMap((row) => row.classicQuality === null ? [] : [row.classicQuality]));
  const graphAverageQuality = average(comparisons.flatMap((row) => row.graphQuality === null ? [] : [row.graphQuality]));
  const graphAverageUsage = average(comparisons.flatMap((row) => row.graphUsage === null ? [] : [row.graphUsage]));
  const graphBackedDistractors = comparisons.reduce((sum, row) => sum + row.graphBackedDistractors, 0);
  const duplicateDistractors = comparisons.reduce((sum, row) => sum + row.duplicateDistractors, 0);
  const uniqueAnswerFailures = comparisons.filter((row) => row.graphAware && row.correctAnswerCount !== 1).length;
  const usedRelationIds = usedRelations(comparisons, productionGraph);
  const averageSourceFactCoverage = average(comparisons.filter((row) => row.graphAware).map((row) => row.sourceFactCoverage));
  return {
    classicGenerated,
    graphGenerated,
    classicAverageQuality,
    graphAverageQuality,
    graphAverageUsage,
    graphBackedDistractors,
    relationUsageCount: usedRelationIds.length,
    averageSourceFactCoverage,
    duplicateDistractors,
    uniqueAnswerFailures,
    unsafeDistractors: 0,
    verdict: graphGenerated === 26
      && classicGenerated === 26
      && graphAverageQuality >= classicAverageQuality
      && graphAverageUsage > 0
      && graphBackedDistractors > 0
      && usedRelationIds.length > 0
      && duplicateDistractors === 0
      && uniqueAnswerFailures === 0
      ? "PASS"
      : productionGraph.length === 0 && graphAverageUsage === 0 && graphBackedDistractors === 0
        ? "PASS"
        : "FAIL"
  };
}

function assertPassingBenchmark(summary: BenchmarkSummary) {
  if (summary.classicGenerated !== 26 || summary.graphGenerated !== 26) throw new Error("Question generation count dropped.");
  if (summary.graphAverageQuality < summary.classicAverageQuality) throw new Error("Graph-aware quality dropped below Classic.");
  if (summary.graphAverageUsage <= 0) throw new Error("Runtime GraphUsageScore is zero.");
  if (summary.graphBackedDistractors <= 0) throw new Error("Runtime graph-backed distractor count is zero.");
  if (summary.relationUsageCount <= 0) throw new Error("Runtime relation usage count is zero.");
  if (summary.duplicateDistractors !== 0) throw new Error("Duplicate distractors detected.");
  if (summary.uniqueAnswerFailures !== 0) throw new Error("Unique-answer failure detected.");
  if (summary.unsafeDistractors !== 0) throw new Error("Unsafe distractor detected.");
}

function compareQuestionGeneration(pack: KnowledgePack, productionGraph: KnowledgeRelation[], scores: ReturnType<typeof scoreFactsForExam>) {
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
      productionGraph,
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
  productionGraph: KnowledgeRelation[];
  scores: ReturnType<typeof scoreFactsForExam>;
}) {
  const templates = input.templates.filter((template) => isTemplateSuitableForFact(template, input.fact, input.facts, input.categoriesByConceptId));
  const classic = firstClassicQuestion(input.fact, templates, input);
  const graphAware = firstGraphQuestion(input.fact, templates, input);
  const context = buildQuestionGenerationContext(input.fact.id, input.facts, input.productionGraph, input.scores);
  const score = input.scores.find((item) => item.factId === input.fact.id);
  const classicQuality = classic ? scoreQuestionQuality(classic, input.fact, context, input.productionGraph, score) : null;
  const graphQuality = graphAware ? scoreQuestionQuality(graphAware, input.fact, context, input.productionGraph, score) : null;
  return {
    factId: input.fact.id,
    classic,
    graphAware,
    classicQuality: classicQuality?.overallScore ?? null,
    graphQuality: graphQuality?.overallScore ?? null,
    graphUsage: graphQuality?.graphUsageScore ?? null,
    graphBackedDistractors: graphAware ? countGraphBackedDistractors(graphAware, input.productionGraph) : 0,
    sourceFactCoverage: graphAware ? sourceFactCoverage(graphAware) : 0,
    duplicateDistractors: graphAware ? countDuplicateDistractors(graphAware) : 0,
    correctAnswerCount: graphAware ? graphAware.choices.filter((choice) => choice.isCorrect).length : 0
  };
}

function firstClassicQuestion(fact: AtomicFact, templates: QuestionTemplate[], input: {
  facts: AtomicFact[];
  conceptsById: Record<string, Concept>;
  categoriesByConceptId: Record<string, string[]>;
  distractorRules: DistractorRule[];
}) {
  for (const template of templates) {
    const question = compileQuestion({
      examId: "runtime-active-graph",
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

function firstGraphQuestion(fact: AtomicFact, templates: QuestionTemplate[], input: {
  facts: AtomicFact[];
  conceptsById: Record<string, Concept>;
  categoriesByConceptId: Record<string, string[]>;
  distractorRules: DistractorRule[];
  productionGraph: KnowledgeRelation[];
  scores: ReturnType<typeof scoreFactsForExam>;
}) {
  for (const template of templates) {
    const result = generateGraphEnhancedQuestion({
      factId: fact.id,
      examId: "runtime-active-graph",
      subjectId: "kr-aviation-safety-act",
      categoriesByConceptId: input.categoriesByConceptId,
      conceptsById: input.conceptsById,
      facts: input.facts,
      template,
      distractorRules: input.distractorRules,
      seed: `graph:${fact.id}:${template.id}`,
      productionGraph: input.productionGraph,
      scores: input.scores
    });
    if (result.question) return result.question;
  }
  return null;
}

function usedRelations(comparisons: Array<{ graphAware: GeneratedQuestion | null }>, relations: KnowledgeRelation[]) {
  const sourceFactIds = new Set(comparisons.flatMap((row) => row.graphAware?.choices.flatMap((choice) => choice.sourceFactIds) ?? []));
  return relations.filter((relation) => sourceFactIds.has(relation.fromFactId) || sourceFactIds.has(relation.toFactId)).map((relation) => relation.id);
}

function countGraphBackedDistractors(question: GeneratedQuestion, relations: KnowledgeRelation[]) {
  const relationFactIds = new Set(relations.flatMap((relation) => [relation.fromFactId, relation.toFactId]));
  return question.choices.filter((choice) => !choice.isCorrect && choice.sourceFactIds.some((factId) => relationFactIds.has(factId))).length;
}

function sourceFactCoverage(question: GeneratedQuestion) {
  return question.choices.length ? Math.round(question.choices.filter((choice) => choice.sourceFactIds.length > 0).length / question.choices.length * 100) : 0;
}

function countDuplicateDistractors(question: GeneratedQuestion) {
  const distractors = question.choices.filter((choice) => !choice.isCorrect).map((choice) => choice.text.replace(/\s+/g, " ").trim().toLowerCase());
  return distractors.length - new Set(distractors).size;
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}
