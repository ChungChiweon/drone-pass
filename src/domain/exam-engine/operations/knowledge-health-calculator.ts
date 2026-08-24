import type { AtomicFact, KnowledgeRelation, SourceDocument } from "@/domain/exam-engine/types";
import type { KnowledgeFactLifecycle } from "@/domain/exam-engine/knowledge-lifecycle/knowledge-lifecycle";
import type { KnowledgeHealthQueues, KnowledgeHealthSummary, KnowledgeHealthWarning, KnowledgeHealthWarningLevel } from "./knowledge-operations";

export function calculateKnowledgeHealth(
  facts: AtomicFact[],
  relations: KnowledgeRelation[] = [],
  lifecycle: KnowledgeFactLifecycle[] = [],
  queues: KnowledgeHealthQueues = {},
  sourceDocuments: SourceDocument[] = []
): KnowledgeHealthSummary {
  const lifecycleByFactId = new Map(lifecycle.map((item) => [item.factId, item]));
  const draftFacts = facts.filter((fact) => lifecycleByFactId.get(fact.id)?.status === "draft" || (!lifecycleByFactId.has(fact.id) && fact.status === "draft")).length;
  const deprecatedFacts = facts.filter((fact) => lifecycleByFactId.get(fact.id)?.status === "deprecated" || fact.status === "expired").length;
  const activeFacts = facts.filter((fact) => lifecycleByFactId.get(fact.id)?.status === "active" || (!lifecycleByFactId.has(fact.id) && fact.status === "approved")).length;
  const approvedRelations = relations.filter((relation) => relation.reviewStatus === "approved").length;
  const pendingRelations = relations.filter((relation) => relation.reviewStatus !== "approved" && relation.reviewStatus !== "rejected").length;
  const graphConnectionScore = facts.length ? round(new Set(relations.flatMap((relation) => [relation.fromFactId, relation.toFactId])).size / facts.length) : 0;
  const sourceCoverageScore = facts.length ? round(facts.filter((fact) => fact.sourceReferences.length > 0).length / facts.length) : 0;
  const reviewBacklogCount = (queues.factReviewQueueCount ?? 0) + (queues.graphReviewQueueCount ?? 0) + (queues.promotionPendingCount ?? 0);
  const changeBacklogCount = (queues.propagationPendingCount ?? 0) + (queues.rebuildCandidateCount ?? 0);
  const warnings = buildWarnings({
    activeGraphVersion: queues.activeGraphVersion ?? null,
    sourceCoverageScore,
    reviewBacklogCount,
    changeBacklogCount
  });

  return {
    totalFacts: facts.length,
    activeFacts,
    deprecatedFacts,
    draftFacts,
    totalRelations: relations.length,
    approvedRelations,
    pendingRelations,
    activeGraphVersion: queues.activeGraphVersion ?? null,
    factReviewQueueCount: queues.factReviewQueueCount ?? 0,
    graphReviewQueueCount: queues.graphReviewQueueCount ?? 0,
    promotionPendingCount: queues.promotionPendingCount ?? 0,
    propagationPendingCount: queues.propagationPendingCount ?? 0,
    rebuildCandidateCount: queues.rebuildCandidateCount ?? 0,
    totalSources: sourceDocuments.length || new Set(facts.flatMap((fact) => fact.sourceReferences.map((reference) => reference.documentId))).size,
    sourceCoverageScore,
    graphConnectionScore,
    reviewBacklogCount,
    changeBacklogCount,
    warningLevel: highestWarningLevel(warnings),
    warnings
  };
}

function buildWarnings(input: {
  activeGraphVersion: string | null;
  sourceCoverageScore: number;
  reviewBacklogCount: number;
  changeBacklogCount: number;
}): KnowledgeHealthWarning[] {
  const warnings: KnowledgeHealthWarning[] = [];
  if (!input.activeGraphVersion) {
    warnings.push({ level: "HIGH", code: "ACTIVE_GRAPH_MISSING", message: "Active production graph version is not set." });
  }
  if (input.sourceCoverageScore < 0.8) {
    warnings.push({ level: "HIGH", code: "LOW_SOURCE_COVERAGE", message: "Source coverage is below 80%." });
  }
  if (input.changeBacklogCount >= 10) {
    warnings.push({ level: "HIGH", code: "CHANGE_BACKLOG_HIGH", message: "Pending propagation/rebuild backlog is high." });
  } else if (input.changeBacklogCount > 0) {
    warnings.push({ level: "MEDIUM", code: "CHANGE_BACKLOG_PENDING", message: "Pending propagation/rebuild tasks exist." });
  }
  if (input.reviewBacklogCount >= 20) {
    warnings.push({ level: "MEDIUM", code: "REVIEW_BACKLOG_GROWING", message: "Review backlog is growing." });
  }
  if (!warnings.length) {
    warnings.push({ level: "LOW", code: "HEALTH_OK", message: "Knowledge operations health is normal." });
  }
  return warnings;
}

function highestWarningLevel(warnings: KnowledgeHealthWarning[]): KnowledgeHealthWarningLevel {
  if (warnings.some((warning) => warning.level === "HIGH")) return "HIGH";
  if (warnings.some((warning) => warning.level === "MEDIUM")) return "MEDIUM";
  return "LOW";
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
