import type { KnowledgeRelation } from "@/domain/exam-engine/types";
import type { ApprovedGraphRelation, KnowledgeGraphVersion } from "./graph-versioning";

export type CreateGraphVersionInput = {
  packId: string;
  versionId: string;
  relationCount: number;
  createdAt: string;
};

export type KnowledgeGraphApprovalRepository = {
  getActiveGraph(packId: string): Promise<KnowledgeGraphVersion | null>;
  createGraphVersion(input: CreateGraphVersionInput): Promise<KnowledgeGraphVersion>;
  addApprovedRelation(versionId: string, relation: ApprovedGraphRelation): Promise<ApprovedGraphRelation>;
  archiveVersion(versionId: string): Promise<KnowledgeGraphVersion | null>;
};

export function createDraftGraphVersion(input: CreateGraphVersionInput): KnowledgeGraphVersion {
  return {
    versionId: input.versionId,
    packId: input.packId,
    createdAt: input.createdAt,
    relationCount: input.relationCount,
    status: "draft"
  };
}

export function archivedGraphVersion(version: KnowledgeGraphVersion): KnowledgeGraphVersion {
  return { ...version, status: "archived" };
}

export function activeApprovedRelationCount(relations: KnowledgeRelation[]) {
  return relations.filter((relation) => relation.reviewStatus === "approved").length;
}
