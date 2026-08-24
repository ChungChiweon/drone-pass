import type { AtomicFact, Concept, GeneratedQuestion, KnowledgeRelation } from "@/domain/exam-engine/types";
import { analyzeFactImpact } from "./fact-impact-analyzer";
import type { FactChangePreview, FactDeprecationRecord, FactImpactReport, FactVersion, KnowledgeFactLifecycle } from "./knowledge-lifecycle";

export type FactChangeInput = {
  statement: string;
  changeReason: string;
  confidence?: number;
  createdAt?: string;
};

export type KnowledgeLifecycleManagerInput = {
  facts: AtomicFact[];
  relations?: KnowledgeRelation[];
  questions?: GeneratedQuestion[];
  concepts?: Concept[];
  lifecycles?: KnowledgeFactLifecycle[];
  versions?: FactVersion[];
};

export function createKnowledgeLifecycleManager(input: KnowledgeLifecycleManagerInput) {
  return {
    getFactLifecycle(factId: string) {
      return getFactLifecycle(factId, input.facts, input.lifecycles ?? []);
    },
    createVersionPreview(fact: AtomicFact, change: FactChangeInput) {
      return createVersionPreview(fact, change, input.versions ?? []);
    },
    analyzeUpdateImpact(factId: string) {
      return analyzeUpdateImpact(factId, input.relations ?? [], input.questions ?? [], input.concepts ?? []);
    }
  };
}

export function getFactLifecycle(
  factId: string,
  facts: AtomicFact[],
  lifecycles: KnowledgeFactLifecycle[] = []
): KnowledgeFactLifecycle | null {
  const existing = lifecycles.find((lifecycle) => lifecycle.factId === factId);
  if (existing) return existing;
  const fact = facts.find((item) => item.id === factId);
  if (!fact) return null;
  const now = fact.effectiveFrom ?? "unknown";
  return {
    factId,
    currentVersion: fact.version,
    status: fact.status === "approved" ? "active" : "draft",
    createdAt: now,
    updatedAt: now
  };
}

export function createVersionPreview(
  fact: AtomicFact,
  change: FactChangeInput,
  versions: FactVersion[] = []
): FactChangePreview {
  const createdAt = change.createdAt ?? new Date().toISOString();
  const nextVersion: FactVersion = {
    versionId: nextVersionId(fact.id, versions),
    factId: fact.id,
    statement: change.statement,
    sourceReference: fact.sourceReferences[0],
    confidence: change.confidence ?? fact.confidence ?? 0.5,
    createdAt,
    changeReason: change.changeReason
  };
  return {
    factId: fact.id,
    previousStatement: fact.statement,
    nextStatement: change.statement,
    nextVersion
  };
}

export function analyzeUpdateImpact(
  factId: string,
  relations: KnowledgeRelation[] = [],
  questions: GeneratedQuestion[] = [],
  concepts: Concept[] = []
): FactImpactReport {
  return analyzeFactImpact(factId, relations, questions, concepts);
}

export function createDeprecationRecord(
  factId: string,
  reason: string,
  replacedByFactId?: string,
  createdAt = new Date().toISOString()
): FactDeprecationRecord {
  return { factId, reason, replacedByFactId, createdAt };
}

function nextVersionId(factId: string, versions: FactVersion[]) {
  const count = versions.filter((version) => version.factId === factId).length + 1;
  return `${factId}:v${count + 1}`;
}
