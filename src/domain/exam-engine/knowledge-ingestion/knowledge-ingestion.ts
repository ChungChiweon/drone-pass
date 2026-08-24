import type { AtomicFact, RelationType, SourceReference } from "@/domain/exam-engine/types";

export type KnowledgeSourceType = "LAW" | "REGULATION" | "TEXTBOOK" | "EXAM" | "OTHER";

export type KnowledgeSourceInput = {
  sourceId: string;
  sourceType: KnowledgeSourceType;
  title: string;
  version: string;
  content: string;
  sourceReference: SourceReference;
};

export type FactCandidateStatus = "draft" | "duplicate_candidate" | "review_candidate" | "accepted" | "rejected" | "held";

export type FactCandidate = {
  candidateId: string;
  sourceId: string;
  statement: string;
  legalSubject?: string;
  legalAction?: string;
  condition?: string;
  exception?: string;
  threshold?: string;
  applicability?: string;
  legalContext?: {
    articleId?: string;
    paragraphId?: string;
    clauseId?: string;
    itemId?: string;
    sourceLocator?: string;
    fullArticleText?: string;
  };
  conceptHint?: string;
  categoryHint?: string;
  extractedNumbers: string[];
  extractedConditions: string[];
  extractedExceptions: string[];
  confidence: number;
  sourceReference: SourceReference;
  status: FactCandidateStatus;
};

export type FactDuplicateResult = {
  isDuplicate: boolean;
  matchedFactIds: string[];
  confidence: number;
  reasons: string[];
};

export type RelatedExistingFact = {
  factId: string;
  relationHint: "same_concept" | "same_predicate" | "shared_number" | "graph_relation";
  confidence: number;
  reason: string;
};

export type KnowledgeExpansionResult = {
  sourceId: string;
  newCandidates: FactCandidate[];
  duplicateCandidates: FactCandidate[];
  reviewCandidates: FactCandidate[];
  rejectedCandidates: FactCandidate[];
};

export type FactCandidateReviewAction = "REVIEW" | "ACCEPT" | "REJECT" | "MERGE" | "HOLD";

export type FactCandidateReview = {
  candidateId: string;
  reviewerId?: string;
  previousStatus: FactCandidateStatus;
  nextStatus: FactCandidateStatus;
  action: FactCandidateReviewAction;
  memo: string;
  timestamp: string;
};

export type FactMergeProposal = {
  candidateId: string;
  targetFactId: string;
  reason: string;
  confidence: number;
};

export type FactPromotionValidationResult = {
  valid: boolean;
  warnings: string[];
  errors: string[];
};

export type FactGraphPromotionCandidate = {
  newFactId: string;
  relatedFactIds: string[];
  suggestedRelations: Array<{
    toFactId: string;
    relationType: Extract<RelationType, "RELATED" | "SAME_CONCEPT" | "COMPARISON_PAIR" | "CONFUSED_WITH">;
    reason: string;
    confidence: number;
  }>;
};

export type FactPromotionPreview = {
  candidateId: string;
  proposedFactId: string;
  statement: string;
  conceptId?: string;
  categoryId?: string;
  sourceReference: SourceReference;
  confidence: number;
  validationResult: FactPromotionValidationResult;
  graphConnectionCandidates: FactGraphPromotionCandidate;
};

export type FactPromotionExecutionState = "pending" | "approved" | "executed" | "rolled_back";

export type FactPromotionExecution = {
  previewId: string;
  candidateId: string;
  generatedFactId: string;
  previousState: FactPromotionExecutionState;
  nextState: FactPromotionExecutionState;
  createdAt: string;
  createdBy: string;
};

export type FactPromotionAuditAction = "EXECUTE_PREVIEW" | "ROLLBACK";

export type FactPromotionAudit = {
  promotionId: string;
  candidateId: string;
  action: FactPromotionAuditAction;
  reviewerId: string;
  timestamp: string;
  memo: string;
};

export type FactPromotionExecutionResult = {
  execution: FactPromotionExecution;
  generatedFact: AtomicFact;
  audit: FactPromotionAudit;
};

export type FactPromotionRollbackResult = {
  execution: FactPromotionExecution;
  audit: FactPromotionAudit;
};
