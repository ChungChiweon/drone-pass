import type { FactCandidate } from "@/domain/exam-engine/knowledge-ingestion/knowledge-ingestion";
import type { ExpansionPriority, KnowledgeExpansionScore, KnowledgeExpansionScoringContext } from "./expansion-intelligence";
import { calculateCoverageImpact, coverageImpactScore } from "./coverage-impact-calculator";
import { calculateGraphExpansionPotential } from "./graph-expansion-potential";
import { detectFactNovelty } from "./fact-novelty-detector";
import { predictQuestionYield, questionYieldScore } from "./question-yield-predictor";

export function scoreKnowledgeExpansion(candidate: FactCandidate, context: KnowledgeExpansionScoringContext): KnowledgeExpansionScore {
  const graphPotential = calculateGraphExpansionPotential(candidate, context.graphContext);
  const coverageImpact = calculateCoverageImpact(candidate, context.currentCoverage);
  const yieldPrediction = predictQuestionYield(candidate, context.questionTemplates, graphPotential.overallGraphPotential);
  const novelty = detectFactNovelty(candidate, context);

  const qualityScore = round(context.qualityScore ?? context.autoPromotionDecision?.score ?? candidate.confidence);
  const coverageScore = coverageImpactScore(coverageImpact);
  const examYieldScore = questionYieldScore(yieldPrediction, context.questionTemplates.length);
  const graphPotentialScore = graphPotential.overallGraphPotential;
  const noveltyScore = novelty.noveltyScore;
  const finalExpansionScore = round(
    (qualityScore * 0.3) +
    (coverageScore * 0.3) +
    (examYieldScore * 0.2) +
    (graphPotentialScore * 0.1) +
    (noveltyScore * 0.1)
  );

  return {
    candidateId: candidate.candidateId,
    qualityScore,
    coverageImpactScore: coverageScore,
    examYieldScore,
    graphPotentialScore,
    noveltyScore,
    finalExpansionScore,
    priority: priorityFor(finalExpansionScore),
    reasons: [
      `quality=${qualityScore}`,
      `coverageImpact=${coverageScore} gaps=${coverageImpact.resolvedGaps.map((gap) => `${gap.gapType}:${gap.targetId}`).join(",") || "none"}`,
      `yield=${examYieldScore} questions=${yieldPrediction.expectedQuestions} templates=${yieldPrediction.expectedTemplates.join(",")}`,
      `graph=${graphPotentialScore} ${graphPotential.reasons.join(",") || "weak graph signal"}`,
      `novelty=${noveltyScore} ${novelty.reasons.join(",") || "baseline novelty"}`
    ]
  };
}

export function priorityFor(score: number): ExpansionPriority {
  if (score >= 0.82) return "CRITICAL";
  if (score >= 0.68) return "HIGH";
  if (score >= 0.48) return "MEDIUM";
  return "LOW";
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
