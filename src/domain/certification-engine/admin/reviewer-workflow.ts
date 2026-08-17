import type { CertificationAuthContext } from "@/domain/certification-engine/auth/certification-auth";
import { canAccess } from "@/domain/certification-engine/auth/authorization-policy";

export type ReviewQueueTargetType = "FACT" | "GRAPH";

export type ReviewQueueItem = {
  targetType: ReviewQueueTargetType;
  targetId: string;
  priority: number;
  reason: string;
};

export type ReviewerWorkflowResult = {
  allowed: boolean;
  queue: ReviewQueueItem[];
  message: string;
};

export function prepareFactReview(authContext: CertificationAuthContext, factIds: string[]): ReviewerWorkflowResult {
  return prepareReviewQueue(authContext, "FACT", factIds);
}

export function prepareGraphReview(authContext: CertificationAuthContext, relationIds: string[]): ReviewerWorkflowResult {
  return prepareReviewQueue(authContext, "GRAPH", relationIds);
}

function prepareReviewQueue(authContext: CertificationAuthContext, targetType: ReviewQueueTargetType, ids: string[]): ReviewerWorkflowResult {
  const access = canAccess(authContext, "REVIEW", {
    domainId: authContext.scope?.domainId ?? "",
    packId: authContext.scope?.packId ?? ""
  });
  if (!access.allowed) {
    return { allowed: false, queue: [], message: access.reason ?? "Review access denied" };
  }
  return {
    allowed: true,
    queue: ids.map((targetId, index) => ({
      targetType,
      targetId,
      priority: ids.length - index,
      reason: `${targetType} review candidate`
    })),
    message: `${ids.length} ${targetType.toLowerCase()} review items prepared`
  };
}
