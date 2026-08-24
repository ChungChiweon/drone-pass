export type DecisionType =
  | "REVIEW_PRIORITY"
  | "GRAPH_REBUILD"
  | "QUESTION_REGENERATION"
  | "FACT_UPDATE_IMPACT"
  | "FACT_APPROVAL_PRIORITY"
  | "KNOWLEDGE_EXPANSION_REQUIRED"
  | "EXAM_READY_AFTER_EXPANSION"
  | "EXAM_READY_BALANCED"
  | "KNOWLEDGE_BALANCE_REQUIRED"
  | "EXPANSION_ROADMAP_REQUIRED"
  | "EXPANSION_EXECUTION_REQUIRED"
  | "REVIEW_BATCH_REQUIRED"
  | "PROMOTION_EXCEPTION_REMEDIATION_REQUIRED"
  | "TARGETED_SOURCE_VERIFICATION_REQUIRED"
  | "PROMOTION_REPLACEMENT_REQUIRED"
  | "CANARY_RESULT_RECALCULATION_REQUIRED"
  | "BATCH_ONE_COMPLETION_PLAN_READY"
  | "PROMOTION_STATE_RECONCILIATION_REQUIRED"
  | "ADDITIONAL_CANARY_REQUIRED"
  | "BATCH_SOURCE_EXPANSION_REQUIRED"
  | "LEARNING_INTERVENTION"
  | "PACK_HEALTH";

export type DecisionTargetType = "FACT" | "GRAPH" | "QUESTION" | "LEARNER" | "PACK" | "WORKFLOW";

export type DecisionPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type DecisionSupportContext = {
  decisionId: string;
  domainId: string;
  packId: string;
  decisionType: DecisionType;
  targetType: DecisionTargetType;
  targetId: string;
  graphContext?: {
    hasApprovedGraph?: boolean;
    healthScore?: number;
    averageRelationConfidence?: number;
  };
  examContext?: {
    examValueScore?: number;
    questionQualityScore?: number;
    sourceConfidence?: number;
    coverageGapScore?: number;
    expectedQuestionIncrease?: number;
  };
  analyticsContext?: {
    wrongRate?: number;
    masteryScore?: number;
    sampleSize?: number;
    reviewBacklogCount?: number;
    sourceCoverageScore?: number;
  };
  auditContext?: {
    riskScore?: number;
    riskLevel?: "LOW" | "MEDIUM" | "HIGH";
  };
  workflowContext?: {
    impactLevel?: "low" | "medium" | "high";
    pendingTasks?: number;
  };
  createdAt: string;
};

export type DecisionRecommendation = {
  recommendationId: string;
  decisionType: DecisionType;
  targetId: string;
  action: string;
  reason: string;
  confidence: number;
  priority: DecisionPriority;
  supportingSignals: string[];
  risks: string[];
  requiresHumanApproval: boolean;
};
