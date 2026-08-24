import { describe, expect, it } from "vitest";
import { guardDecisionExecution } from "./decision-approval-boundary";
import { calculateDecisionConfidence } from "./decision-confidence-calculator";
import type { DecisionSupportContext } from "./decision-support";
import { generateDecisionRecommendations } from "./decision-support-engine";
import { recommendationToWorkflowInput } from "./decision-workflow-adapter";

function context(overrides: Partial<DecisionSupportContext> = {}): DecisionSupportContext {
  return {
    decisionId: "decision-1",
    domainId: "kr-drone-license",
    packId: "kr-drone-license:mrm0omvd",
    decisionType: "QUESTION_REGENERATION",
    targetType: "QUESTION",
    targetId: "Q-001",
    graphContext: { hasApprovedGraph: true, healthScore: 0.9, averageRelationConfidence: 0.8 },
    examContext: { examValueScore: 0.8, questionQualityScore: 0.4, sourceConfidence: 0.9 },
    analyticsContext: { sampleSize: 30 },
    auditContext: { riskScore: 0.1, riskLevel: "LOW" },
    workflowContext: {},
    createdAt: "2026-07-30T00:00:00.000Z",
    ...overrides
  };
}

describe("AI decision support layer", () => {
  it("recommends question regeneration for high exam value and low quality", () => {
    const recommendations = generateDecisionRecommendations(context());

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0]).toMatchObject({
      decisionType: "QUESTION_REGENERATION",
      action: "REGENERATE_QUESTION_CANDIDATE",
      priority: "HIGH",
      requiresHumanApproval: true
    });
  });

  it("recommends high impact fact review", () => {
    const recommendations = generateDecisionRecommendations(context({
      decisionType: "FACT_UPDATE_IMPACT",
      targetType: "FACT",
      targetId: "AF-001",
      workflowContext: { impactLevel: "high" }
    }));

    expect(recommendations[0]).toMatchObject({
      decisionType: "FACT_UPDATE_IMPACT",
      priority: "CRITICAL",
      action: "PRIORITIZE_FACT_IMPACT_REVIEW"
    });
  });

  it("warns when approved graph is missing or graph health is low", () => {
    const recommendations = generateDecisionRecommendations(context({
      decisionType: "GRAPH_REBUILD",
      targetType: "GRAPH",
      targetId: "kg-v1",
      graphContext: { hasApprovedGraph: false, healthScore: 0.3, averageRelationConfidence: 0.5 }
    }));

    expect(recommendations[0]).toMatchObject({
      decisionType: "GRAPH_REBUILD",
      action: "REVIEW_GRAPH_REBUILD_PLAN",
      priority: "HIGH"
    });
  });

  it("recommends learner intervention for high wrong rate and low mastery", () => {
    const recommendations = generateDecisionRecommendations(context({
      decisionType: "LEARNING_INTERVENTION",
      targetType: "LEARNER",
      targetId: "learner-1",
      analyticsContext: { wrongRate: 0.55, masteryScore: 0.3, sampleSize: 40 }
    }));

    expect(recommendations[0]).toMatchObject({
      decisionType: "LEARNING_INTERVENTION",
      action: "SUGGEST_TARGETED_REVIEW",
      requiresHumanApproval: false
    });
  });

  it("calculates confidence from source, graph, exam, quality, sample, and audit risk", () => {
    expect(calculateDecisionConfidence({
      sourceConfidence: 0.9,
      graphRelationConfidence: 0.8,
      examScore: 0.85,
      questionQuality: 0.7,
      analyticsSampleSize: 50,
      auditRisk: 0.2
    })).toBeGreaterThan(0.8);
  });

  it("blocks execution without human approval and converts recommendations to workflow input", () => {
    const recommendation = generateDecisionRecommendations(context())[0];

    expect(guardDecisionExecution({ recommendation })).toMatchObject({
      allowed: false,
      message: "Human approval is required before executing this recommendation"
    });
    expect(guardDecisionExecution({ recommendation, approvedBy: "reviewer-1" }).allowed).toBe(true);
    expect(recommendationToWorkflowInput(recommendation)).toMatchObject({
      recommendationId: recommendation.recommendationId,
      targetId: "Q-001",
      suggestedStep: {
        action: "CREATE_REVIEW_TASK",
        retryPolicy: { strategy: "NONE" }
      }
    });
  });
});
