import type { FactCandidate } from "@/domain/exam-engine/knowledge-ingestion/knowledge-ingestion";
import type { GraphPotential, KnowledgeExpansionScoringContext } from "./expansion-intelligence";

export function calculateGraphExpansionPotential(candidate: FactCandidate, context: KnowledgeExpansionScoringContext["graphContext"] = {}): GraphPotential {
  const reasons: string[] = [];
  const existingConceptConnectionScore = candidate.conceptHint ? Math.min(1, (context.relatedFactCount ?? 0) * 0.2) : 0;
  if (existingConceptConnectionScore > 0) reasons.push(`existing concept links=${context.relatedFactCount ?? 0}`);

  const confusedWithPotential = context.confusedWithPossible || candidate.extractedNumbers.length > 0 ? 0.75 : 0.15;
  if (confusedWithPotential >= 0.75) reasons.push("confused-with distractor potential");

  const comparisonPairPotential = context.comparisonPairPossible || candidate.extractedNumbers.length > 0 ? 0.8 : 0.1;
  if (comparisonPairPotential >= 0.8) reasons.push("comparison pair potential");

  const prerequisitePotential = context.prerequisitePossible || candidate.extractedConditions.length > 0 ? 0.65 : 0.1;
  if (prerequisitePotential >= 0.65) reasons.push("condition/prerequisite potential");

  const isolatedFactResolutionScore = context.resolvesIsolatedFact ? 1 : 0;
  if (isolatedFactResolutionScore > 0) reasons.push("isolated fact resolution");

  return {
    existingConceptConnectionScore: round(existingConceptConnectionScore),
    confusedWithPotential,
    comparisonPairPotential,
    prerequisitePotential,
    isolatedFactResolutionScore,
    overallGraphPotential: round(Math.min(1,
      (existingConceptConnectionScore * 0.25) +
      (confusedWithPotential * 0.25) +
      (comparisonPairPotential * 0.25) +
      (prerequisitePotential * 0.15) +
      (isolatedFactResolutionScore * 0.1)
    )),
    reasons
  };
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
