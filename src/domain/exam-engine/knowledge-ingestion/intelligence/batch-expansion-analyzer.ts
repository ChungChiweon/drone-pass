import type { ExpansionBatchReport, ExpansionCandidateInput, ExpansionPriority, KnowledgeExpansionScore } from "./expansion-intelligence";
import { scoreKnowledgeExpansion } from "./expansion-intelligence-engine";
import { predictQuestionYield } from "./question-yield-predictor";
import { calculateGraphExpansionPotential } from "./graph-expansion-potential";
import { calculateCoverageImpact } from "./coverage-impact-calculator";

export function analyzeExpansionCandidates(candidates: ExpansionCandidateInput[], limit = 20): ExpansionBatchReport {
  const scores = candidates
    .map((input) => scoreKnowledgeExpansion(input.candidate, input.context))
    .toSorted((left, right) => right.finalExpansionScore - left.finalExpansionScore || left.candidateId.localeCompare(right.candidateId));
  const topCandidates = scores.slice(0, limit);

  return {
    totalCandidates: candidates.length,
    topCandidates,
    averageScore: round(average(scores.map((score) => score.finalExpansionScore))),
    predictedQuestionIncrease: predictedQuestionIncrease(candidates, topCandidates),
    predictedCoverageIncrease: predictedCoverageIncrease(candidates, topCandidates),
    priorityDistribution: priorityDistribution(scores),
    autoPromotionSummary: {
      highQualityLowExpansion: scores.filter((score) => score.qualityScore >= 0.85 && score.finalExpansionScore < 0.48).length,
      highQualityHighExpansion: scores.filter((score) => score.qualityScore >= 0.85 && score.finalExpansionScore >= 0.68).length
    }
  };
}

function predictedQuestionIncrease(inputs: ExpansionCandidateInput[], selected: KnowledgeExpansionScore[]) {
  const selectedIds = new Set(selected.map((score) => score.candidateId));
  return inputs
    .filter((input) => selectedIds.has(input.candidate.candidateId))
    .reduce((sum, input) => {
      const graph = calculateGraphExpansionPotential(input.candidate, input.context.graphContext);
      return sum + predictQuestionYield(input.candidate, input.context.questionTemplates, graph.overallGraphPotential).expectedQuestions;
    }, 0);
}

function predictedCoverageIncrease(inputs: ExpansionCandidateInput[], selected: KnowledgeExpansionScore[]) {
  const selectedIds = new Set(selected.map((score) => score.candidateId));
  return inputs
    .filter((input) => selectedIds.has(input.candidate.candidateId))
    .reduce((sum, input) => sum + calculateCoverageImpact(input.candidate, input.context.currentCoverage).coverageIncrease, 0);
}

function priorityDistribution(scores: KnowledgeExpansionScore[]): Record<ExpansionPriority, number> {
  return {
    CRITICAL: scores.filter((score) => score.priority === "CRITICAL").length,
    HIGH: scores.filter((score) => score.priority === "HIGH").length,
    MEDIUM: scores.filter((score) => score.priority === "MEDIUM").length,
    LOW: scores.filter((score) => score.priority === "LOW").length
  };
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
