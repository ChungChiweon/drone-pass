import type {
  FactCandidate,
  FactCandidateReview,
  FactCandidateReviewAction,
  FactCandidateStatus,
  FactDuplicateResult,
  FactMergeProposal
} from "./knowledge-ingestion";

export type ReviewCandidateInput = {
  candidate: FactCandidate;
  action: FactCandidateReviewAction;
  reviewerId?: string;
  memo?: string;
  duplicateMatches?: FactDuplicateResult;
  mergeTargetFactId?: string;
  timestamp?: string;
};

export type ReviewCandidateResult = {
  candidate: FactCandidate;
  review: FactCandidateReview;
  mergeProposal?: FactMergeProposal;
};

export function reviewCandidate(input: ReviewCandidateInput): ReviewCandidateResult {
  const nextStatus = statusForAction(input.action);
  const timestamp = input.timestamp ?? new Date().toISOString();
  const candidate: FactCandidate = { ...input.candidate, status: nextStatus };
  const review: FactCandidateReview = {
    candidateId: input.candidate.candidateId,
    reviewerId: input.reviewerId,
    previousStatus: input.candidate.status,
    nextStatus,
    action: input.action,
    memo: input.memo ?? "",
    timestamp
  };
  const mergeProposal = input.action === "MERGE"
    ? buildMergeProposal(input.candidate, input.duplicateMatches, input.mergeTargetFactId)
    : undefined;

  return { candidate, review, mergeProposal };
}

function statusForAction(action: FactCandidateReviewAction): FactCandidateStatus {
  if (action === "ACCEPT") return "accepted";
  if (action === "REJECT") return "rejected";
  if (action === "MERGE") return "duplicate_candidate";
  if (action === "HOLD") return "held";
  return "review_candidate";
}

function buildMergeProposal(candidate: FactCandidate, duplicateMatches?: FactDuplicateResult, mergeTargetFactId?: string): FactMergeProposal {
  const targetFactId = mergeTargetFactId ?? duplicateMatches?.matchedFactIds[0];
  if (!targetFactId) {
    throw new Error("MERGE action requires a target fact.");
  }
  return {
    candidateId: candidate.candidateId,
    targetFactId,
    reason: duplicateMatches?.reasons.join("; ") || "manual merge review",
    confidence: duplicateMatches?.confidence ?? candidate.confidence
  };
}
