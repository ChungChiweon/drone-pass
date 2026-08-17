import type { KnowledgeRelation } from "@/domain/exam-engine/types/knowledge-graph";
import type { KnowledgeRelationReview } from "./graph-review";

export type KnowledgeGraphVersionStatus = "draft" | "review" | "active" | "archived";

export type KnowledgeGraphVersion = {
  versionId: string;
  packId: string;
  versionNumber?: number;
  createdAt: string;
  createdBy?: string;
  relationCount: number;
  relationIds?: string[];
  sourceReviewSummary?: {
    approvedRelationCount: number;
    heldRelationCount: number;
    auditRawCount?: number;
    auditEffectiveTransitionCount?: number;
  };
  contentHash?: string;
  benchmarkSummary?: {
    classicQuality: number;
    graphAwareQuality: number;
    graphUsageScore: number;
    graphBackedDistractorCount: number;
    unsafeDistractorCount: number;
    uniquenessFailureCount: number;
  };
  status: KnowledgeGraphVersionStatus;
};

export type ApprovedGraphRelation = {
  relation: KnowledgeRelation;
  approvedAt: string;
  approvedBy: string;
  sourceVersion: string;
};

export type KnowledgeGraphSnapshot = {
  versionId: string;
  packId: string;
  relations: KnowledgeRelation[];
  createdAt: string;
};

export type GraphApprovalResult = {
  approvedRelation: ApprovedGraphRelation;
  audit: KnowledgeRelationReview;
};

export type KnowledgeGraphVersionAuditAction = "GRAPH_VERSION_ACTIVATED" | "GRAPH_VERSION_ROLLED_BACK";

export type KnowledgeGraphVersionAudit = {
  auditId: string;
  action: KnowledgeGraphVersionAuditAction;
  versionId: string;
  packId: string;
  previousActiveVersionId: string | null;
  nextActiveVersionId: string | null;
  relationCount: number;
  activatedBy?: string;
  rolledBackBy?: string;
  activatedAt?: string;
  rolledBackAt?: string;
  reason: string;
  benchmarkSummary?: NonNullable<KnowledgeGraphVersion["benchmarkSummary"]> & {
    relationUsageCount?: number;
  };
};
