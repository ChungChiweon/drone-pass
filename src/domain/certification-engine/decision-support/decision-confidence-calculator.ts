import type { DecisionSupportContext } from "./decision-support";

export type DecisionConfidenceInput = {
  sourceConfidence?: number;
  graphRelationConfidence?: number;
  examScore?: number;
  questionQuality?: number;
  analyticsSampleSize?: number;
  auditRisk?: number;
};

export function calculateDecisionConfidence(input: DecisionConfidenceInput) {
  const source = normalize(input.sourceConfidence ?? 0.5);
  const graph = normalize(input.graphRelationConfidence ?? 0.5);
  const exam = normalize(input.examScore ?? 0.5);
  const quality = normalize(input.questionQuality ?? 0.5);
  const sample = normalizeSample(input.analyticsSampleSize ?? 0);
  const riskPenalty = normalize(input.auditRisk ?? 0) * 0.15;

  return clamp((source * 0.25) + (graph * 0.20) + (exam * 0.20) + (quality * 0.15) + (sample * 0.20) - riskPenalty);
}

export function calculateContextConfidence(context: DecisionSupportContext) {
  return calculateDecisionConfidence({
    sourceConfidence: context.examContext?.sourceConfidence,
    graphRelationConfidence: context.graphContext?.averageRelationConfidence,
    examScore: context.examContext?.examValueScore,
    questionQuality: context.examContext?.questionQualityScore,
    analyticsSampleSize: context.analyticsContext?.sampleSize,
    auditRisk: context.auditContext?.riskScore
  });
}

function normalize(value: number) {
  return value > 1 ? clamp(value / 100) : clamp(value);
}

function normalizeSample(value: number) {
  return clamp(value / 50);
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}
