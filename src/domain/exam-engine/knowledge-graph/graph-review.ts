import type { KnowledgeGraphReviewStatus } from "@/domain/exam-engine/types";

export type KnowledgeRelationReviewAction = "REVIEW" | "APPROVE" | "REJECT" | "HOLD";

export type KnowledgeRelationReview = {
  auditId?: string;
  relationId: string;
  reviewerId?: string;
  previousStatus: KnowledgeGraphReviewStatus;
  nextStatus: KnowledgeGraphReviewStatus;
  action: KnowledgeRelationReviewAction;
  memo: string;
  timestamp: string;
};
