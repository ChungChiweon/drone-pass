import type { KnowledgeRelation } from "@/domain/exam-engine/types";
import type { GraphApprovalResult } from "./graph-versioning";

export type GraphReviewer = {
  reviewerId: string;
  sourceVersion: string;
  approvedAt?: string;
  memo?: string;
};

export function approveRelationCandidate(relation: KnowledgeRelation, reviewer: GraphReviewer): GraphApprovalResult {
  const approvedAt = reviewer.approvedAt ?? new Date().toISOString();
  const approvedRelation = {
    relation: {
      ...relation,
      reviewStatus: "approved" as const
    },
    approvedAt,
    approvedBy: reviewer.reviewerId,
    sourceVersion: reviewer.sourceVersion
  };

  return {
    approvedRelation,
    audit: {
      relationId: relation.id,
      reviewerId: reviewer.reviewerId,
      previousStatus: relation.reviewStatus,
      nextStatus: "approved",
      action: "APPROVE",
      memo: reviewer.memo ?? "",
      timestamp: approvedAt
    }
  };
}
