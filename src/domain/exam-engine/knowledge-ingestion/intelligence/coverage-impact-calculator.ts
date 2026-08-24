import type { FactCandidate } from "@/domain/exam-engine/knowledge-ingestion/knowledge-ingestion";
import type { CoverageImpact, KnowledgeExpansionScoringContext } from "./expansion-intelligence";

export function calculateCoverageImpact(candidate: FactCandidate, currentCoverage: KnowledgeExpansionScoringContext["currentCoverage"]): CoverageImpact {
  const newCategories = candidate.categoryHint && !coverageEntryExists(currentCoverage.categoryCoverage, candidate.categoryHint) ? [candidate.categoryHint] : [];
  const newConcepts = candidate.conceptHint && !coverageEntryExists(currentCoverage.conceptCoverage, candidate.conceptHint) ? [candidate.conceptHint] : [];
  const resolvedGaps = currentCoverage.missingCoverage.filter((gap) => {
    if (gap.gapType === "CATEGORY") return candidate.categoryHint === gap.targetId;
    if (gap.gapType === "CONCEPT") return candidate.conceptHint === gap.targetId;
    if (gap.gapType === "TEMPLATE") return templatePotential(candidate).includes(gap.targetId);
    if (gap.gapType === "DIFFICULTY") return difficultyPotential(candidate).includes(gap.targetId);
    return false;
  });

  return {
    newCategories,
    newConcepts,
    resolvedGaps,
    coverageIncrease: round(Math.min(1, (newCategories.length * 0.25) + (newConcepts.length * 0.2) + resolvedGaps.reduce((sum, gap) => sum + gap.priorityScore, 0) * 0.15))
  };
}

export function coverageImpactScore(impact: CoverageImpact) {
  return round(Math.min(1, (impact.newCategories.length * 0.25) + (impact.newConcepts.length * 0.2) + (impact.resolvedGaps.length * 0.12) + impact.coverageIncrease * 0.43));
}

function coverageEntryExists(entries: Array<{ id: string; totalCount: number }>, id: string) {
  return entries.some((entry) => entry.id === id && entry.totalCount > 0);
}

function templatePotential(candidate: FactCandidate) {
  const potentials = ["SELECT_TRUE", "SELECT_FALSE", "CONCEPT_COMPARISON"];
  if (candidate.extractedNumbers.length > 0) potentials.push("NUMERIC_THRESHOLD");
  if (candidate.extractedConditions.length > 0 || candidate.extractedExceptions.length > 0) potentials.push("CASE_JUDGMENT");
  return potentials;
}

function difficultyPotential(candidate: FactCandidate) {
  const difficulties = ["easy", "medium"];
  if (candidate.extractedConditions.length > 0 || candidate.extractedExceptions.length > 0) difficulties.push("hard");
  return difficulties;
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
