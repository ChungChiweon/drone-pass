import type { WorkflowStep } from "@/domain/certification-engine/workflow/certification-workflow";
import type { DecisionRecommendation } from "./decision-support";

export type DecisionWorkflowInput = {
  recommendationId: string;
  targetId: string;
  suggestedStep: WorkflowStep;
  payload: DecisionRecommendation;
};

export function recommendationToWorkflowInput(recommendation: DecisionRecommendation): DecisionWorkflowInput {
  return {
    recommendationId: recommendation.recommendationId,
    targetId: recommendation.targetId,
    suggestedStep: {
      stepId: `decision:${recommendation.action}`,
      name: recommendation.action,
      action: actionToWorkflowStep(recommendation.action),
      order: 1,
      retryPolicy: {
        maxAttempts: 1,
        delayMs: 0,
        strategy: "NONE"
      }
    },
    payload: recommendation
  };
}

function actionToWorkflowStep(action: string): WorkflowStep["action"] {
  if (action.includes("REPORT") || action.includes("WARNING")) return "GENERATE_REPORT";
  if (action.includes("ANALYTICS") || action.includes("REVIEW")) return "UPDATE_ANALYTICS";
  if (action.includes("IMPACT")) return "RUN_IMPACT_ANALYSIS";
  if (action.includes("AUDIT")) return "CREATE_AUDIT";
  return "CREATE_REVIEW_TASK";
}
