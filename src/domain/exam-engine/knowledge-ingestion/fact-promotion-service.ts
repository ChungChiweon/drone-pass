import type { AtomicFact } from "@/domain/exam-engine/types";
import type {
  FactPromotionAudit,
  FactPromotionExecution,
  FactPromotionExecutionResult,
  FactPromotionPreview,
  FactPromotionRollbackResult
} from "./knowledge-ingestion";

export type PromotionReviewer = {
  reviewerId: string;
  memo?: string;
  timestamp?: string;
};

export function executePromotion(
  preview: FactPromotionPreview,
  reviewer: PromotionReviewer
): FactPromotionExecutionResult {
  if (!preview.validationResult.valid) {
    throw new Error(`Promotion preview is invalid: ${preview.validationResult.errors.join(", ")}`);
  }
  const timestamp = reviewer.timestamp ?? new Date().toISOString();
  const promotionId = previewId(preview);
  const generatedFact = buildAtomicFactDraft(preview, timestamp);
  const execution: FactPromotionExecution = {
    previewId: promotionId,
    candidateId: preview.candidateId,
    generatedFactId: generatedFact.id,
    previousState: "approved",
    nextState: "executed",
    createdAt: timestamp,
    createdBy: reviewer.reviewerId
  };
  const audit: FactPromotionAudit = {
    promotionId,
    candidateId: preview.candidateId,
    action: "EXECUTE_PREVIEW",
    reviewerId: reviewer.reviewerId,
    timestamp,
    memo: reviewer.memo ?? ""
  };

  return { execution, generatedFact, audit };
}

export function rollbackPromotion(
  execution: FactPromotionExecution,
  reviewer: PromotionReviewer
): FactPromotionRollbackResult {
  const timestamp = reviewer.timestamp ?? new Date().toISOString();
  const rolledBack: FactPromotionExecution = {
    ...execution,
    previousState: execution.nextState,
    nextState: "rolled_back"
  };
  return {
    execution: rolledBack,
    audit: {
      promotionId: execution.previewId,
      candidateId: execution.candidateId,
      action: "ROLLBACK",
      reviewerId: reviewer.reviewerId,
      timestamp,
      memo: reviewer.memo ?? ""
    }
  };
}

function buildAtomicFactDraft(preview: FactPromotionPreview, timestamp: string): AtomicFact {
  return {
    id: preview.proposedFactId,
    conceptId: preview.conceptId ?? "UNASSIGNED_CONCEPT",
    subject: preview.statement,
    predicate: "ingested_fact",
    value: preview.statement,
    statement: preview.statement,
    conditions: [],
    exceptions: [],
    sourceReferences: [preview.sourceReference],
    confidence: preview.confidence,
    reviewNote: `Promotion preview generated at ${timestamp}. KnowledgePack append is intentionally not performed here.`,
    version: "promotion-preview",
    status: "draft"
  };
}

function previewId(preview: FactPromotionPreview) {
  return `promotion:${preview.candidateId}:${preview.proposedFactId}`;
}
