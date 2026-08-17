import type { KnowledgeRelation } from "@/domain/exam-engine/types/knowledge-graph";
import { checksumRelations } from "./graph-version-candidate";
import type { KnowledgeGraphVersionAudit } from "./graph-versioning";
import type {
  GraphVersionActivationInput,
  GraphVersionActivationRepository,
  GraphVersionActivationResult,
  GraphVersionActivationValidation,
  GraphVersionRollbackResult
} from "./graph-version-activation-types";

export async function validateGraphVersionActivation(
  repository: GraphVersionActivationRepository,
  input: Omit<GraphVersionActivationInput, "reviewerId" | "reason">
): Promise<GraphVersionActivationValidation> {
  const errors: string[] = [];
  const [version, relations, activeGraph] = await Promise.all([
    repository.getVersion(input.versionId),
    repository.getRelations(input.packId),
    repository.getActiveGraph(input.packId)
  ]);
  const relationIds = version?.relationIds ?? [];
  const selectedRelations = relationIds.map((id) => relations.find((relation) => relation.id === id));
  const factIds = new Set(input.facts.map((fact) => fact.id));
  const approvedFactIds = new Set(input.facts.filter((fact) => fact.status === "approved").map((fact) => fact.id));

  if (!version) errors.push("Candidate version missing.");
  if (version && version.packId !== input.packId) errors.push(`Candidate packId mismatch: ${version.packId}.`);
  if (version && version.status !== "draft") errors.push(`Candidate status must be draft, got ${version.status}.`);
  if (version && version.relationCount !== input.relationIds.length) errors.push(`Candidate relationCount must be ${input.relationIds.length}.`);
  if (version && version.contentHash !== input.expectedContentHash) errors.push(`Candidate contentHash mismatch: ${version.contentHash}.`);
  if (version && checksumRelations(input.packId, relationIds) !== input.expectedContentHash) errors.push("Recomputed contentHash mismatch.");
  if (version && JSON.stringify(relationIds) !== JSON.stringify(input.relationIds)) errors.push("Candidate relationIds mismatch.");
  if (new Set(relationIds).size !== relationIds.length) errors.push("Duplicate relation ids are not allowed.");
  if (input.facts.filter((fact) => fact.status === "approved").length !== input.expectedApprovedFactCount) {
    errors.push(`AtomicFact approved count must be ${input.expectedApprovedFactCount}.`);
  }

  for (const relationId of input.relationIds) {
    const relation = relations.find((item) => item.id === relationId);
    if (!relation) {
      errors.push(`Missing relation ${relationId}.`);
      continue;
    }
    if (relation.reviewStatus !== "approved") errors.push(`${relation.id} is ${relation.reviewStatus}, not approved.`);
    if (relation.packId !== input.packId) errors.push(`${relation.id} packId mismatch.`);
    if (relation.fromFactId === relation.toFactId) errors.push(`${relation.id} is a self relation.`);
    if (!factIds.has(relation.fromFactId)) errors.push(`${relation.id} missing fromFact ${relation.fromFactId}.`);
    if (!factIds.has(relation.toFactId)) errors.push(`${relation.id} missing toFact ${relation.toFactId}.`);
    if (!approvedFactIds.has(relation.fromFactId)) errors.push(`${relation.id} fromFact ${relation.fromFactId} is not approved.`);
    if (!approvedFactIds.has(relation.toFactId)) errors.push(`${relation.id} toFact ${relation.toFactId} is not approved.`);
  }
  if (selectedRelations.some((relation) => relation?.reviewStatus === "held")) errors.push("Held relation is included.");

  return {
    ok: errors.length === 0,
    errors,
    activeVersionId: activeGraph?.versionId ?? null,
    activeRelationCount: activeGraph?.relations.length ?? 0
  };
}

export async function activateGraphVersionCandidate(
  repository: GraphVersionActivationRepository,
  input: GraphVersionActivationInput
): Promise<GraphVersionActivationResult> {
  const activeGraph = await repository.getActiveGraph(input.packId);
  if (activeGraph?.versionId === input.versionId) {
    const activeVersion = await repository.getVersion(input.versionId);
    if (!activeVersion) throw new Error("Active version missing.");
    return { version: activeVersion, audit: null, noOp: true };
  }
  const validation = await validateGraphVersionActivation(repository, input);
  if (!validation.ok) throw new Error(`Graph activation blocked: ${validation.errors.join("; ")}`);
  const version = await repository.getVersion(input.versionId);
  if (!version) throw new Error("Candidate version missing.");
  const timestamp = input.now?.() ?? new Date().toISOString();
  const relations = await repository.getRelations(input.packId);

  for (const activeVersion of await repository.getVersions(input.packId)) {
    if (activeVersion.status === "active") {
      await repository.saveVersion({ ...activeVersion, status: "archived" });
    }
  }
  const activeVersion = await repository.saveVersion({ ...version, status: "active", relationCount: input.relationIds.length });
  for (const relationId of input.relationIds) {
    const relation = relations.find((item) => item.id === relationId);
    if (!relation) throw new Error(`Missing relation ${relationId}.`);
    await repository.saveApproval({
      relation: relation as KnowledgeRelation & { reviewStatus: "approved" },
      approvedAt: timestamp,
      approvedBy: input.reviewerId,
      sourceVersion: input.versionId
    });
  }
  const audit: KnowledgeGraphVersionAudit = {
    auditId: input.generateAuditId?.() ?? generateGraphVersionAuditId(),
    action: "GRAPH_VERSION_ACTIVATED",
    versionId: input.versionId,
    packId: input.packId,
    previousActiveVersionId: validation.activeVersionId,
    nextActiveVersionId: input.versionId,
    relationCount: input.relationIds.length,
    activatedBy: input.reviewerId,
    activatedAt: timestamp,
    reason: input.reason,
    benchmarkSummary: activeVersion.benchmarkSummary
      ? { ...activeVersion.benchmarkSummary, relationUsageCount: input.relationIds.length }
      : undefined
  };
  await repository.saveVersionAudit(audit);
  return { version: activeVersion, audit, noOp: false };
}

export async function rollbackActiveGraphVersion(
  repository: GraphVersionActivationRepository,
  input: {
    packId: string;
    versionId: string;
    reviewerId: string;
    reason: string;
    now?: () => string;
    generateAuditId?: () => string;
  }
): Promise<GraphVersionRollbackResult> {
  const activeGraph = await repository.getActiveGraph(input.packId);
  const version = await repository.getVersion(input.versionId);
  if (!version) throw new Error("Version missing.");
  if (activeGraph?.versionId !== input.versionId) {
    return { version, audit: null, noOp: true };
  }
  const timestamp = input.now?.() ?? new Date().toISOString();
  const draftVersion = await repository.saveVersion({ ...version, status: "draft" });
  const audit: KnowledgeGraphVersionAudit = {
    auditId: input.generateAuditId?.() ?? generateGraphVersionAuditId(),
    action: "GRAPH_VERSION_ROLLED_BACK",
    versionId: input.versionId,
    packId: input.packId,
    previousActiveVersionId: input.versionId,
    nextActiveVersionId: null,
    relationCount: activeGraph.relations.length,
    rolledBackBy: input.reviewerId,
    rolledBackAt: timestamp,
    reason: input.reason
  };
  await repository.saveVersionAudit(audit);
  return { version: draftVersion, audit, noOp: false };
}

export function createRollbackDryRun(input: {
  versionId: string;
  relationCount: number;
  previousActiveVersionId: string | null;
}) {
  return {
    rollbackTargetVersion: input.versionId,
    previousActiveVersionId: input.previousActiveVersionId,
    nextActiveVersionId: null,
    nextActiveRelations: 0,
    nextCandidateStatus: "draft" as const,
    affectedRelationCount: input.relationCount
  };
}

export function generateGraphVersionAuditId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `KGV-AUD-${uuid}`;
  return `KGV-AUD-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}
