import type { DecisionRecommendation } from "./decision-support";

export type DecisionExecutionRequest = {
  recommendation: DecisionRecommendation;
  approvedBy?: string;
};

export type DecisionExecutionResult = {
  allowed: boolean;
  recommendationId: string;
  message: string;
};

export function requireHumanApproval(recommendation: DecisionRecommendation) {
  return {
    ...recommendation,
    requiresHumanApproval: true
  };
}

export function guardDecisionExecution(request: DecisionExecutionRequest): DecisionExecutionResult {
  if (request.recommendation.requiresHumanApproval && !request.approvedBy) {
    return {
      allowed: false,
      recommendationId: request.recommendation.recommendationId,
      message: "Human approval is required before executing this recommendation"
    };
  }
  return {
    allowed: true,
    recommendationId: request.recommendation.recommendationId,
    message: "Execution boundary passed; caller remains responsible for explicit workflow execution"
  };
}
