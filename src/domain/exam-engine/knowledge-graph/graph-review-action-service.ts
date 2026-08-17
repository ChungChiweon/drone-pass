import type { AtomicFact, KnowledgeGraphReviewStatus, KnowledgeRelation } from "@/domain/exam-engine/types";
import { validateKnowledgeRelations } from "./graph-validator";
import type { KnowledgeGraphPersistenceRepository } from "./local-knowledge-graph-repository";
import type { KnowledgeRelationReview, KnowledgeRelationReviewAction } from "./graph-review";
import { generateAuditId, type AuditIdGenerator } from "./knowledge-relation-review-audit-id";
import type { ApprovedGraphRelation, KnowledgeGraphSnapshot, KnowledgeGraphVersion } from "./graph-versioning";

export type GraphReviewActionInput = {
  relation: KnowledgeRelation;
  reviewerId?: string;
  memo?: string;
  timestamp?: string;
  auditIdGenerator?: AuditIdGenerator;
};

export type GraphReviewActionResult = {
  relation: KnowledgeRelation;
  audit: KnowledgeRelationReview | null;
};

export type CreateGraphDraftVersionInput = {
  packId: string;
  relations: KnowledgeRelation[];
  timestamp?: string;
};

export type ActivateGraphVersionInput = {
  version: KnowledgeGraphVersion;
  relations: KnowledgeRelation[];
  facts: AtomicFact[];
  reviewerId: string;
  timestamp?: string;
};

const NON_TRANSITIONAL_STATUSES = new Set<KnowledgeGraphReviewStatus>(["approved", "rejected", "held"]);

export async function approveRelation(input: GraphReviewActionInput, repository: KnowledgeGraphPersistenceRepository) {
  return saveReviewAction(input, repository, "APPROVE", "approved");
}

export async function rejectRelation(input: GraphReviewActionInput, repository: KnowledgeGraphPersistenceRepository) {
  return saveReviewAction(input, repository, "REJECT", "rejected");
}

export async function holdRelation(input: GraphReviewActionInput, repository: KnowledgeGraphPersistenceRepository) {
  return saveReviewAction(input, repository, "HOLD", "held");
}

export async function createDraftVersionFromApprovedRelations(
  input: CreateGraphDraftVersionInput,
  repository: KnowledgeGraphPersistenceRepository
) {
  const approvedRelations = input.relations.filter((relation) => relation.packId === input.packId && relation.reviewStatus === "approved");
  const createdAt = input.timestamp ?? new Date().toISOString();
  const version = await repository.saveVersion({
    packId: input.packId,
    versionId: `kg-${input.packId}-${createdAt.replace(/[^0-9]/g, "")}`,
    relationCount: approvedRelations.length,
    createdAt
  });
  return version;
}

export async function activateGraphVersion(
  input: ActivateGraphVersionInput,
  repository: KnowledgeGraphPersistenceRepository
): Promise<KnowledgeGraphSnapshot> {
  if (input.version.status !== "draft" && input.version.status !== "review") {
    throw new Error("Only draft or review graph versions can be activated.");
  }
  const approvedRelations = input.relations.filter((relation) => relation.packId === input.version.packId && relation.reviewStatus === "approved");
  if (approvedRelations.length !== input.version.relationCount) {
    throw new Error("Approved relation count does not match the graph version.");
  }
  const validation = validateKnowledgeRelations(input.facts, approvedRelations);
  if (validation.issues.length) {
    throw new Error(`Graph version has invalid relations: ${validation.issues.map((issue) => issue.code).join(", ")}`);
  }

  const timestamp = input.timestamp ?? new Date().toISOString();
  const currentActive = await repository.getActiveGraph(input.version.packId);
  if (currentActive) {
    await repository.archiveVersion(currentActive.versionId);
  }

  const activeVersion: KnowledgeGraphVersion = { ...input.version, status: "active", relationCount: validation.validRelations.length };
  await repository.saveVersion(activeVersion);
  for (const relation of validation.validRelations) {
    const approval: ApprovedGraphRelation = {
      relation,
      approvedAt: timestamp,
      approvedBy: input.reviewerId,
      sourceVersion: activeVersion.versionId
    };
    await repository.saveApproval(approval);
  }

  return {
    versionId: activeVersion.versionId,
    packId: activeVersion.packId,
    relations: validation.validRelations,
    createdAt: timestamp
  };
}

async function saveReviewAction(
  input: GraphReviewActionInput,
  repository: KnowledgeGraphPersistenceRepository,
  action: KnowledgeRelationReviewAction,
  nextStatus: KnowledgeGraphReviewStatus
): Promise<GraphReviewActionResult> {
  const currentRelation = (await repository.getRelations(input.relation.packId)).find((relation) => relation.id === input.relation.id) ?? input.relation;
  if (NON_TRANSITIONAL_STATUSES.has(currentRelation.reviewStatus)) {
    if (currentRelation.reviewStatus === nextStatus) {
      return { relation: currentRelation, audit: null };
    }
    throw new Error(`Relation ${input.relation.id} is already ${currentRelation.reviewStatus}.`);
  }
  if (currentRelation.reviewStatus === nextStatus) {
    return { relation: currentRelation, audit: null };
  }
  const timestamp = input.timestamp ?? new Date().toISOString();
  const auditId = input.auditIdGenerator?.generateAuditId() ?? generateAuditId();
  const relation: KnowledgeRelation = { ...currentRelation, reviewStatus: nextStatus };
  const audit: KnowledgeRelationReview = {
    auditId,
    relationId: input.relation.id,
    reviewerId: input.reviewerId,
    previousStatus: currentRelation.reviewStatus,
    nextStatus,
    action,
    memo: input.memo ?? "",
    timestamp
  };
  await repository.saveRelation(relation);
  await repository.saveReviewAudit(audit);
  return { relation, audit };
}
