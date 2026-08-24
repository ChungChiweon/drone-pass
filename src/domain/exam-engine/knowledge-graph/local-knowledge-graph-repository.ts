import type { KnowledgeRelation } from "@/domain/exam-engine/types/knowledge-graph";
import type { ApprovedGraphRelation, KnowledgeGraphSnapshot, KnowledgeGraphVersion, KnowledgeGraphVersionAudit } from "./graph-versioning";
import { archivedGraphVersion, createDraftGraphVersion, type CreateGraphVersionInput } from "./graph-approval-repository";
import type { KnowledgeRelationReview } from "./graph-review";

export const KNOWLEDGE_GRAPH_RELATIONS_KEY = "dronepass.knowledgeGraphRelations";
export const KNOWLEDGE_GRAPH_VERSIONS_KEY = "dronepass.knowledgeGraphVersions";
export const KNOWLEDGE_GRAPH_APPROVALS_KEY = "dronepass.knowledgeGraphApprovals";
export const KNOWLEDGE_GRAPH_REVIEW_AUDIT_KEY = "dronepass.knowledgeGraphReviewAudit";
export const KNOWLEDGE_GRAPH_VERSION_AUDIT_KEY = "dronepass.knowledgeGraphVersionAudit";

export type KnowledgeGraphReadRepository = {
  getRelations(packId: string): Promise<KnowledgeRelation[]>;
  getActiveGraph(packId: string): Promise<KnowledgeGraphSnapshot | null>;
  getVersion(versionId: string): Promise<KnowledgeGraphVersion | null>;
  getVersions(packId: string): Promise<KnowledgeGraphVersion[]>;
  getReviewAudit(packId: string): Promise<KnowledgeRelationReview[]>;
  getVersionAudit(packId: string): Promise<KnowledgeGraphVersionAudit[]>;
};

export type KnowledgeGraphWriteRepository = {
  saveRelation(relation: KnowledgeRelation): Promise<KnowledgeRelation>;
  saveVersion(input: CreateGraphVersionInput | KnowledgeGraphVersion): Promise<KnowledgeGraphVersion>;
  saveApproval(approval: ApprovedGraphRelation): Promise<ApprovedGraphRelation>;
  saveReviewAudit(entry: KnowledgeRelationReview): Promise<KnowledgeRelationReview>;
  saveVersionAudit(entry: KnowledgeGraphVersionAudit): Promise<KnowledgeGraphVersionAudit>;
  archiveVersion(versionId: string): Promise<KnowledgeGraphVersion | null>;
};

export type KnowledgeGraphPersistenceRepository = KnowledgeGraphReadRepository & KnowledgeGraphWriteRepository & {
  restoreSnapshot(snapshot: KnowledgeGraphSnapshot): Promise<KnowledgeGraphSnapshot>;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readArray<T>(key: string): T[] {
  if (!canUseStorage()) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeArray<T>(key: string, items: T[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(items));
}

export class LocalKnowledgeGraphPersistenceRepository implements KnowledgeGraphPersistenceRepository {
  async getRelations(packId: string) {
    return readArray<KnowledgeRelation>(KNOWLEDGE_GRAPH_RELATIONS_KEY).filter((relation) => relation.packId === packId);
  }

  async getActiveGraph(packId: string) {
    const activeVersion = readArray<KnowledgeGraphVersion>(KNOWLEDGE_GRAPH_VERSIONS_KEY).find((version) => version.packId === packId && version.status === "active");
    if (!activeVersion) return null;
    const approvals = readArray<ApprovedGraphRelation>(KNOWLEDGE_GRAPH_APPROVALS_KEY);
    const relations = approvals
      .filter((approval) => approval.sourceVersion === activeVersion.versionId && approval.relation.packId === packId && approval.relation.reviewStatus === "approved")
      .map((approval) => approval.relation);
    return {
      versionId: activeVersion.versionId,
      packId: activeVersion.packId,
      relations,
      createdAt: activeVersion.createdAt
    };
  }

  async getVersion(versionId: string) {
    return readArray<KnowledgeGraphVersion>(KNOWLEDGE_GRAPH_VERSIONS_KEY).find((version) => version.versionId === versionId) ?? null;
  }

  async getVersions(packId: string) {
    return readArray<KnowledgeGraphVersion>(KNOWLEDGE_GRAPH_VERSIONS_KEY)
      .filter((version) => version.packId === packId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async getReviewAudit(packId: string) {
    const relationIds = new Set((await this.getRelations(packId)).map((relation) => relation.id));
    return readArray<KnowledgeRelationReview>(KNOWLEDGE_GRAPH_REVIEW_AUDIT_KEY).filter((entry) => relationIds.has(entry.relationId));
  }

  async getVersionAudit(packId: string) {
    return readArray<KnowledgeGraphVersionAudit>(KNOWLEDGE_GRAPH_VERSION_AUDIT_KEY).filter((entry) => entry.packId === packId);
  }

  async saveRelation(relation: KnowledgeRelation) {
    const relations = readArray<KnowledgeRelation>(KNOWLEDGE_GRAPH_RELATIONS_KEY);
    const index = relations.findIndex((item) => item.id === relation.id);
    const next = index < 0 ? [...relations, relation] : relations.map((item) => item.id === relation.id ? relation : item);
    writeArray(KNOWLEDGE_GRAPH_RELATIONS_KEY, next);
    return relation;
  }

  async saveVersion(input: CreateGraphVersionInput | KnowledgeGraphVersion) {
    const version = "status" in input ? input : createDraftGraphVersion(input);
    const versions = readArray<KnowledgeGraphVersion>(KNOWLEDGE_GRAPH_VERSIONS_KEY);
    const index = versions.findIndex((item) => item.versionId === version.versionId);
    const next = index < 0 ? [...versions, version] : versions.map((item) => item.versionId === version.versionId ? version : item);
    writeArray(KNOWLEDGE_GRAPH_VERSIONS_KEY, next);
    return version;
  }

  async saveApproval(approval: ApprovedGraphRelation) {
    const approvals = readArray<ApprovedGraphRelation>(KNOWLEDGE_GRAPH_APPROVALS_KEY);
    const index = approvals.findIndex((item) => item.sourceVersion === approval.sourceVersion && item.relation.id === approval.relation.id);
    const next = index < 0 ? [...approvals, approval] : approvals.map((item) => item.sourceVersion === approval.sourceVersion && item.relation.id === approval.relation.id ? approval : item);
    writeArray(KNOWLEDGE_GRAPH_APPROVALS_KEY, next);
    return approval;
  }

  async saveReviewAudit(entry: KnowledgeRelationReview) {
    const audit = readArray<KnowledgeRelationReview>(KNOWLEDGE_GRAPH_REVIEW_AUDIT_KEY);
    writeArray(KNOWLEDGE_GRAPH_REVIEW_AUDIT_KEY, [...audit, entry]);
    return entry;
  }

  async saveVersionAudit(entry: KnowledgeGraphVersionAudit) {
    const audit = readArray<KnowledgeGraphVersionAudit>(KNOWLEDGE_GRAPH_VERSION_AUDIT_KEY);
    writeArray(KNOWLEDGE_GRAPH_VERSION_AUDIT_KEY, [...audit, entry]);
    return entry;
  }

  async archiveVersion(versionId: string) {
    const versions = readArray<KnowledgeGraphVersion>(KNOWLEDGE_GRAPH_VERSIONS_KEY);
    const version = versions.find((item) => item.versionId === versionId);
    if (!version) return null;
    const archived = archivedGraphVersion(version);
    writeArray(KNOWLEDGE_GRAPH_VERSIONS_KEY, versions.map((item) => item.versionId === versionId ? archived : item));
    return archived;
  }

  async restoreSnapshot(snapshot: KnowledgeGraphSnapshot) {
    await this.saveVersion({
      versionId: snapshot.versionId,
      packId: snapshot.packId,
      createdAt: snapshot.createdAt,
      relationCount: snapshot.relations.length,
      status: "active"
    });
    for (const relation of snapshot.relations) {
      await this.saveRelation(relation);
      if (relation.reviewStatus === "approved") {
        await this.saveApproval({
          relation,
          approvedAt: snapshot.createdAt,
          approvedBy: "snapshot",
          sourceVersion: snapshot.versionId
        });
      }
    }
    return snapshot;
  }
}

export function createLocalKnowledgeGraphPersistenceRepository(): KnowledgeGraphPersistenceRepository {
  return new LocalKnowledgeGraphPersistenceRepository();
}
