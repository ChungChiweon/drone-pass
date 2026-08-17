export type {
  CoverageImpact,
  ExpansionBatchReport,
  ExpansionCandidateInput,
  ExpansionPriority,
  FactNoveltyScore,
  GraphPotential,
  KnowledgeExpansionScore,
  KnowledgeExpansionScoringContext,
  QuestionYieldPrediction
} from "./expansion-intelligence";
export { calculateCoverageImpact, coverageImpactScore } from "./coverage-impact-calculator";
export { predictQuestionYield, questionYieldScore } from "./question-yield-predictor";
export { calculateGraphExpansionPotential } from "./graph-expansion-potential";
export { detectFactNovelty } from "./fact-novelty-detector";
export { scoreKnowledgeExpansion, priorityFor } from "./expansion-intelligence-engine";
export { analyzeExpansionCandidates } from "./batch-expansion-analyzer";
