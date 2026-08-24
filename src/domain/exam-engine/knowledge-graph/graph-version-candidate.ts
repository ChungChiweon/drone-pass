import type { AtomicFact, KnowledgeRelation } from "@/domain/exam-engine/types";
import type { KnowledgeGraphVersion } from "./graph-versioning";

export type GraphVersionCandidateInput = {
  packId: string;
  relations: KnowledgeRelation[];
  facts: AtomicFact[];
  relationIds: string[];
  createdAt: string;
  createdBy: string;
  versionNumber?: number;
  auditRawCount?: number;
  auditEffectiveTransitionCount?: number;
};

export type GraphVersionCandidateValidation = {
  ok: boolean;
  errors: string[];
  checksum: string;
};

export type GraphVersionCandidateResult = {
  version: KnowledgeGraphVersion;
  relations: KnowledgeRelation[];
  validation: GraphVersionCandidateValidation;
};

export function createInactiveGraphVersionCandidate(input: GraphVersionCandidateInput): GraphVersionCandidateResult {
  const selectedRelations = input.relationIds
    .map((relationId) => input.relations.find((relation) => relation.id === relationId))
    .filter((relation): relation is KnowledgeRelation => Boolean(relation));
  const validation = validateGraphVersionCandidate(input.packId, selectedRelations, input.facts, input.relationIds);
  if (!validation.ok) {
    throw new Error(`Invalid graph version candidate: ${validation.errors.join("; ")}`);
  }

  return {
    relations: selectedRelations,
    validation,
    version: {
      versionId: `kg-candidate-${input.packId}-${input.createdAt.replace(/[^0-9]/g, "")}`,
      packId: input.packId,
      versionNumber: input.versionNumber ?? 1,
      status: "draft",
      relationIds: selectedRelations.map((relation) => relation.id),
      relationCount: selectedRelations.length,
      createdAt: input.createdAt,
      createdBy: input.createdBy,
      sourceReviewSummary: {
        approvedRelationCount: selectedRelations.length,
        heldRelationCount: Math.max(0, input.relations.filter((relation) => relation.reviewStatus === "held").length),
        auditRawCount: input.auditRawCount,
        auditEffectiveTransitionCount: input.auditEffectiveTransitionCount
      },
      contentHash: validation.checksum
    }
  };
}

export function validateGraphVersionCandidate(
  packId: string,
  relations: KnowledgeRelation[],
  facts: AtomicFact[],
  expectedRelationIds: string[]
): GraphVersionCandidateValidation {
  const errors: string[] = [];
  const factIds = new Set(facts.map((fact) => fact.id));
  const relationIds = relations.map((relation) => relation.id);
  const uniqueRelationIds = new Set(relationIds);
  const checksum = checksumRelations(packId, relationIds);

  if (relations.length !== expectedRelationIds.length) {
    errors.push(`Expected ${expectedRelationIds.length} relations but found ${relations.length}.`);
  }
  for (const relationId of expectedRelationIds) {
    if (!relationIds.includes(relationId)) errors.push(`Missing relation ${relationId}.`);
  }
  if (uniqueRelationIds.size !== relationIds.length) {
    errors.push("Duplicate relation ids are not allowed.");
  }
  for (const relation of relations) {
    if (relation.packId !== packId) errors.push(`${relation.id} has packId ${relation.packId}.`);
    if (relation.reviewStatus !== "approved") errors.push(`${relation.id} is ${relation.reviewStatus}, not approved.`);
    if (relation.fromFactId === relation.toFactId) errors.push(`${relation.id} is a self relation.`);
    if (!factIds.has(relation.fromFactId)) errors.push(`${relation.id} has missing fromFact ${relation.fromFactId}.`);
    if (!factIds.has(relation.toFactId)) errors.push(`${relation.id} has missing toFact ${relation.toFactId}.`);
  }

  return {
    ok: errors.length === 0,
    errors,
    checksum
  };
}

export function checksumRelations(packId: string, relationIds: string[]) {
  const source = [packId, ...[...relationIds].sort()].join("|");
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
