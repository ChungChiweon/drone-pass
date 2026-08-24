import { calculateContextConfidence } from "./decision-confidence-calculator";
import type { DecisionPriority, DecisionRecommendation, DecisionSupportContext, DecisionType } from "./decision-support";

export function generateDecisionRecommendations(context: DecisionSupportContext): DecisionRecommendation[] {
  const recommendations: DecisionRecommendation[] = [];

  if ((context.examContext?.examValueScore ?? 0) >= 0.75 && (context.examContext?.questionQualityScore ?? 1) < 0.55) {
    recommendations.push(createRecommendation(context, "QUESTION_REGENERATION", "REGENERATE_QUESTION_CANDIDATE", "High exam value but low question quality", "HIGH", [
      `examValue=${context.examContext?.examValueScore}`,
      `questionQuality=${context.examContext?.questionQualityScore}`
    ], ["Generated output must be reviewed before use"]));
  }

  if ((context.examContext?.coverageGapScore ?? 0) >= 0.55 && (context.examContext?.expectedQuestionIncrease ?? 0) > 0) {
    recommendations.push(createRecommendation(context, "FACT_APPROVAL_PRIORITY", "PRIORITIZE_FACT_APPROVAL_REVIEW", "Fact approval can reduce exam coverage gaps", "HIGH", [
      `coverageGap=${context.examContext?.coverageGapScore}`,
      `expectedQuestionIncrease=${context.examContext?.expectedQuestionIncrease}`,
      `examValue=${context.examContext?.examValueScore}`
    ], ["Recommendation only prioritizes human review; it must not approve facts automatically"]));
  }

  if ((context.examContext?.coverageGapScore ?? 0) >= 0.25 && context.decisionType === "KNOWLEDGE_EXPANSION_REQUIRED") {
    recommendations.push(createRecommendation(context, "KNOWLEDGE_EXPANSION_REQUIRED", "EXPAND_KNOWLEDGE_FOR_BLUEPRINT_GAPS", "Exam blueprint cannot be satisfied by the current approved facts", "HIGH", [
      `coverageGap=${context.examContext?.coverageGapScore}`,
      `expectedQuestionIncrease=${context.examContext?.expectedQuestionIncrease}`,
      `sourceCoverage=${context.analyticsContext?.sourceCoverageScore}`
    ], ["Recommendation only identifies source/fact review targets; it must not create or approve facts automatically"]));
  }

  if (context.decisionType === "EXAM_READY_AFTER_EXPANSION" && (context.examContext?.expectedQuestionIncrease ?? 0) > 0) {
    recommendations.push(createRecommendation(context, "EXAM_READY_AFTER_EXPANSION", "VERIFY_SIMULATED_EXPANSION_REVIEW", "Simulated fact review can satisfy the exam blueprint", "HIGH", [
      `expectedQuestionIncrease=${context.examContext?.expectedQuestionIncrease}`,
      `coverageGap=${context.examContext?.coverageGapScore}`
    ], ["Simulation must be followed by human fact review before any real approval or exam generation"]));
  }

  if (context.decisionType === "EXAM_READY_BALANCED") {
    recommendations.push(createRecommendation(context, "EXAM_READY_BALANCED", "VERIFY_BALANCED_EXPANSION_REVIEW", "Simulated expansion can satisfy the exam blueprint with acceptable balance", "HIGH", [
      `expectedQuestionIncrease=${context.examContext?.expectedQuestionIncrease}`,
      `coverageGap=${context.examContext?.coverageGapScore}`
    ], ["Balanced readiness is simulation-only until each fact passes human review"]));
  }

  if (context.decisionType === "KNOWLEDGE_BALANCE_REQUIRED") {
    recommendations.push(createRecommendation(context, "KNOWLEDGE_BALANCE_REQUIRED", "PRIORITIZE_UNDERREPRESENTED_KNOWLEDGE", "Question count may be possible, but category/concept balance is still weak", "HIGH", [
      `coverageGap=${context.examContext?.coverageGapScore}`,
      `expectedQuestionIncrease=${context.examContext?.expectedQuestionIncrease}`
    ], ["Recommendation must not approve facts automatically; it only changes review priority"]));
  }

  if (context.decisionType === "EXPANSION_ROADMAP_REQUIRED") {
    recommendations.push(createRecommendation(context, "EXPANSION_ROADMAP_REQUIRED", "FOLLOW_EXPANSION_ROADMAP_BATCHES", "Knowledge expansion should proceed in staged review batches", "HIGH", [
      `expectedQuestionIncrease=${context.examContext?.expectedQuestionIncrease}`,
      `coverageGap=${context.examContext?.coverageGapScore}`,
      `reviewBacklog=${context.analyticsContext?.reviewBacklogCount}`
    ], ["Roadmap batches are advisory and must not change fact status automatically"]));
  }

  if (context.decisionType === "EXPANSION_EXECUTION_REQUIRED") {
    recommendations.push(createRecommendation(context, "EXPANSION_EXECUTION_REQUIRED", "EXECUTE_CONTROLLED_EXPANSION_BATCH", "Controlled expansion batch execution is ready for human review workflow", "HIGH", [
      `expectedQuestionIncrease=${context.examContext?.expectedQuestionIncrease}`,
      `reviewBacklog=${context.analyticsContext?.reviewBacklogCount}`,
      `pendingTasks=${context.workflowContext?.pendingTasks}`
    ], ["Execution plan is advisory; it must not approve facts or change graph state automatically"]));
  }

  if (context.decisionType === "REVIEW_BATCH_REQUIRED") {
    recommendations.push(createRecommendation(context, "REVIEW_BATCH_REQUIRED", "START_HUMAN_BATCH_REVIEW", "Expansion batch candidates are ready for human fact review", "HIGH", [
      `reviewBacklog=${context.analyticsContext?.reviewBacklogCount}`,
      `expectedQuestionIncrease=${context.examContext?.expectedQuestionIncrease}`,
      `pendingTasks=${context.workflowContext?.pendingTasks}`
    ], ["Human review must verify evidence; recommendation must not approve candidates automatically"]));
  }

  if (context.decisionType === "PROMOTION_EXCEPTION_REMEDIATION_REQUIRED") {
    const unresolved = context.workflowContext?.pendingTasks ?? 0;
    recommendations.push(createRecommendation(context, "PROMOTION_EXCEPTION_REMEDIATION_REQUIRED", unresolved > 0 ? "REQUEST_HUMAN_REVIEW" : "RUN_AUTO_REMEDIATION", unresolved > 0 ? "Promotion exceptions remain after one remediation attempt" : "Recoverable promotion evidence gaps can be checked automatically", unresolved > 0 ? "HIGH" : "MEDIUM", [
      `remainingExceptions=${unresolved}`,
      `expectedQuestionIncrease=${context.examContext?.expectedQuestionIncrease}`
    ], ["Remediation must use existing repository evidence only and must not change fact status"]));
  }

  if (context.decisionType === "TARGETED_SOURCE_VERIFICATION_REQUIRED") {
    recommendations.push(createRecommendation(context, "TARGETED_SOURCE_VERIFICATION_REQUIRED", "VERIFY_OFFICIAL_SOURCE", "Promotion exception requires targeted official-source verification", "HIGH", [`target=${context.targetId}`], ["Keep the exception on hold unless the official text resolves every blocker"]));
  }

  if (context.decisionType === "PROMOTION_REPLACEMENT_REQUIRED") {
    recommendations.push(createRecommendation(context, "PROMOTION_REPLACEMENT_REQUIRED", (context.examContext?.expectedQuestionIncrease ?? 0) > 0 ? "USE_SAFE_REPLACEMENT" : "REQUEST_SOURCE_EXPANSION", "A policy-safe replacement is required to preserve the blueprint target", "HIGH", [`expectedQuestionIncrease=${context.examContext?.expectedQuestionIncrease}`], ["Replacement remains simulation-only and requires the same strict evidence gate"]));
  }

  if (context.decisionType === "CANARY_RESULT_RECALCULATION_REQUIRED") {
    const expectedIncrease = context.examContext?.expectedQuestionIncrease ?? 0;
    const pendingTasks = context.workflowContext?.pendingTasks ?? 0;
    const sourceCoverage = context.analyticsContext?.sourceCoverageScore ?? 1;
    const action = sourceCoverage < 0.5
      ? "REQUEST_SOURCE_EXPANSION"
      : expectedIncrease >= pendingTasks
        ? "CONTINUE_BATCH"
        : "REPLAN_BATCH";
    recommendations.push(createRecommendation(
      context,
      "CANARY_RESULT_RECALCULATION_REQUIRED",
      action,
      action === "CONTINUE_BATCH"
        ? "Canary runtime and quality results support continuing the recalculated batch plan"
        : action === "REPLAN_BATCH"
          ? "Canary marginal yield is insufficient for the remaining batch target"
          : "Current source coverage is insufficient for a safe batch continuation",
      action === "CONTINUE_BATCH" ? "HIGH" : "CRITICAL",
      [
        `expectedQuestionIncrease=${expectedIncrease}`,
        `remainingCandidates=${pendingTasks}`,
        `sourceCoverage=${sourceCoverage}`
      ],
      ["Recommendation changes ranking only; every remaining promotion still requires its existing gate and approval"]
    ));
  }

  const batchActions: Partial<Record<DecisionType, string>> = {
    BATCH_ONE_COMPLETION_PLAN_READY: "PREPARE_STAGED_BATCH_APPLY",
    PROMOTION_STATE_RECONCILIATION_REQUIRED: "RECONCILE_LOCAL_STATE",
    ADDITIONAL_CANARY_REQUIRED: "RUN_ADDITIONAL_CANARY",
    BATCH_SOURCE_EXPANSION_REQUIRED: "REQUEST_SOURCE_EXPANSION"
  };
  const batchAction = batchActions[context.decisionType];
  if (batchAction) {
    recommendations.push(createRecommendation(
      context,
      context.decisionType,
      batchAction,
      "Batch 1 completion planning requires the indicated human-controlled next step",
      context.decisionType === "BATCH_ONE_COMPLETION_PLAN_READY" ? "HIGH" : "CRITICAL",
      [
        `expectedQuestionIncrease=${context.examContext?.expectedQuestionIncrease ?? 0}`,
        `pendingTasks=${context.workflowContext?.pendingTasks ?? 0}`
      ],
      ["This recommendation is DRY_RUN only and must not change fact, graph, or question data"]
    ));
  }

  if (context.workflowContext?.impactLevel === "high") {
    recommendations.push(createRecommendation(context, "FACT_UPDATE_IMPACT", "PRIORITIZE_FACT_IMPACT_REVIEW", "High impact fact change detected", "CRITICAL", [
      "impactLevel=high"
    ], ["Related questions, graph relations, and scores may need review"]));
  }

  if (context.graphContext?.hasApprovedGraph === false || (context.graphContext?.healthScore ?? 1) < 0.5) {
    recommendations.push(createRecommendation(context, "GRAPH_REBUILD", "REVIEW_GRAPH_REBUILD_PLAN", "Approved graph is missing or graph health is low", "HIGH", [
      `hasApprovedGraph=${context.graphContext?.hasApprovedGraph}`,
      `graphHealth=${context.graphContext?.healthScore}`
    ], ["Graph rebuild candidates require human curation"]));
  }

  if ((context.analyticsContext?.wrongRate ?? 0) >= 0.45 && (context.analyticsContext?.masteryScore ?? 1) < 0.5) {
    recommendations.push(createRecommendation(context, "LEARNING_INTERVENTION", "SUGGEST_TARGETED_REVIEW", "Learner wrong rate is high and mastery is low", "MEDIUM", [
      `wrongRate=${context.analyticsContext?.wrongRate}`,
      `mastery=${context.analyticsContext?.masteryScore}`
    ], ["Recommendation is advisory and should not alter progress automatically"], false));
  }

  if ((context.analyticsContext?.reviewBacklogCount ?? 0) >= 20) {
    recommendations.push(createRecommendation(context, "REVIEW_PRIORITY", "PRIORITIZE_REVIEW_BACKLOG", "Review backlog is high", "HIGH", [
      `reviewBacklog=${context.analyticsContext?.reviewBacklogCount}`
    ], ["Backlog prioritization may change reviewer workload"]));
  }

  if ((context.analyticsContext?.sourceCoverageScore ?? 1) < 0.65) {
    recommendations.push(createRecommendation(context, "PACK_HEALTH", "RAISE_SOURCE_COVERAGE_WARNING", "Source coverage is below target", "MEDIUM", [
      `sourceCoverage=${context.analyticsContext?.sourceCoverageScore}`
    ], ["Source coverage warnings require legal/source review"]));
  }

  return recommendations.filter((recommendation) => recommendation.decisionType === context.decisionType || context.decisionType === "PACK_HEALTH");
}

function createRecommendation(
  context: DecisionSupportContext,
  decisionType: DecisionType,
  action: string,
  reason: string,
  priority: DecisionPriority,
  supportingSignals: string[],
  risks: string[],
  requiresHumanApproval = true
): DecisionRecommendation {
  return {
    recommendationId: `${context.decisionId}:${decisionType}:${context.targetId}`,
    decisionType,
    targetId: context.targetId,
    action,
    reason,
    confidence: calculateContextConfidence(context),
    priority,
    supportingSignals,
    risks,
    requiresHumanApproval
  };
}
