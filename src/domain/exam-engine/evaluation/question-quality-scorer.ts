import type {
  AtomicFact,
  ExamValueScore,
  GeneratedQuestion,
  KnowledgeRelation,
  QuestionGenerationContext
} from "@/domain/exam-engine/types";
import { buildQuestionGenerationContext } from "@/domain/exam-engine/generation/question-generation-context-builder";
import type { QuestionBenchmarkResult, QuestionQualityScore } from "./question-quality";

const WEIGHTS = {
  factAccuracyScore: 0.3,
  distractorQualityScore: 0.2,
  legalConfidenceScore: 0.2,
  difficultyFitScore: 0.15,
  graphUsageScore: 0.1,
  duplicationRiskScore: 0.05
} as const;

export function scoreQuestionQuality(
  question: GeneratedQuestion,
  targetFact: AtomicFact,
  context?: QuestionGenerationContext | null,
  relations: KnowledgeRelation[] = [],
  examValueScore?: ExamValueScore
): QuestionQualityScore {
  return scoreQuestionQualityInternal(question, targetFact, context, relations, examValueScore, 0.2);
}

export function benchmarkQuestions(
  questions: GeneratedQuestion[],
  facts: AtomicFact[],
  relations: KnowledgeRelation[] = [],
  scores: ExamValueScore[] = []
): QuestionBenchmarkResult {
  const factsById = new Map(facts.map((fact) => [fact.id, fact]));
  const scoresByFactId = new Map(scores.map((score) => [score.factId, score]));
  const duplicateCounts = duplicatePatternCounts(questions);
  const qualityScores = questions.flatMap((question) => {
    const factId = question.trace.factId || question.factIds[0];
    const targetFact = factsById.get(factId);
    if (!targetFact) return [];
    const context = buildQuestionGenerationContext(factId, facts, relations, scores);
    const duplicationRiskScore = duplicationRisk(question, duplicateCounts);
    return [scoreQuestionQualityInternal(question, targetFact, context, relations, scoresByFactId.get(factId), duplicationRiskScore)];
  }).sort((left, right) => right.overallScore - left.overallScore);

  return {
    averageScore: average(qualityScores.map((score) => score.overallScore)),
    highestScoreQuestions: qualityScores.slice(0, 5),
    lowestScoreQuestions: [...qualityScores].sort((left, right) => left.overallScore - right.overallScore).slice(0, 5),
    improvementNeeded: qualityScores.filter((score) => score.overallScore < 0.65 || score.duplicationRiskScore >= 0.7),
    scores: qualityScores
  };
}

function scoreQuestionQualityInternal(
  question: GeneratedQuestion,
  targetFact: AtomicFact,
  context: QuestionGenerationContext | null | undefined,
  relations: KnowledgeRelation[],
  examValueScore: ExamValueScore | undefined,
  duplicationRiskScore: number
): QuestionQualityScore {
  const factAccuracyScore = scoreFactAccuracy(question, targetFact);
  const distractorQualityScore = scoreDistractorQuality(question, context, relations);
  const difficultyFitScore = scoreDifficultyFit(question, examValueScore);
  const legalConfidenceScore = scoreLegalConfidence(targetFact);
  const graphUsageScore = scoreGraphUsage(question, context, relations);
  const overallScore = roundScore(
    (factAccuracyScore * WEIGHTS.factAccuracyScore)
    + (distractorQualityScore * WEIGHTS.distractorQualityScore)
    + (legalConfidenceScore * WEIGHTS.legalConfidenceScore)
    + (difficultyFitScore * WEIGHTS.difficultyFitScore)
    + (graphUsageScore * WEIGHTS.graphUsageScore)
    + ((1 - duplicationRiskScore) * WEIGHTS.duplicationRiskScore)
  );

  return {
    questionId: question.id,
    factId: targetFact.id,
    factAccuracyScore,
    distractorQualityScore,
    difficultyFitScore,
    duplicationRiskScore,
    legalConfidenceScore,
    graphUsageScore,
    overallScore,
    reviewStatus: "draft"
  };
}

function scoreFactAccuracy(question: GeneratedQuestion, targetFact: AtomicFact) {
  let score = 0;
  const correctChoice = question.choices.find((choice) => choice.isCorrect);
  if (question.factIds.includes(targetFact.id) || question.trace.factId === targetFact.id) score += 0.45;
  if (correctChoice?.sourceFactIds.includes(targetFact.id)) score += 0.35;
  if (targetFact.sourceReferences.length > 0 || question.sourceReferences.length > 0) score += 0.2;
  return clamp(score);
}

function scoreDistractorQuality(question: GeneratedQuestion, context: QuestionGenerationContext | null | undefined, relations: KnowledgeRelation[]) {
  const distractors = question.choices.filter((choice) => !choice.isCorrect);
  if (!distractors.length) return 0;
  const graphIds = graphDistractorIds(context, relations);
  const graphBacked = distractors.filter((choice) => choice.sourceFactIds.some((id) => graphIds.has(id))).length;
  const ruleBacked = distractors.filter((choice) => Boolean(choice.mutationType)).length;
  const randomish = distractors.filter((choice) => choice.sourceFactIds.length === 0).length;
  return clamp((graphBacked / distractors.length * 0.7) + (ruleBacked / distractors.length * 0.25) - (randomish / distractors.length * 0.25));
}

function scoreDifficultyFit(question: GeneratedQuestion, examValueScore?: ExamValueScore) {
  if (!examValueScore) return 0.65;
  const expected = expectedDifficulty(examValueScore);
  if (question.difficulty === expected) return 1;
  if ((question.difficulty === "easy" && expected === "medium") || (question.difficulty === "medium" && expected !== "medium") || (question.difficulty === "hard" && expected === "medium")) return 0.65;
  return 0.35;
}

function scoreLegalConfidence(targetFact: AtomicFact) {
  const factConfidence = typeof targetFact.confidence === "number" ? targetFact.confidence : 0.65;
  const sourceScore = targetFact.sourceReferences.length > 0 ? 0.35 : 0;
  return clamp((factConfidence * 0.65) + sourceScore);
}

function scoreGraphUsage(question: GeneratedQuestion, context: QuestionGenerationContext | null | undefined, relations: KnowledgeRelation[]) {
  if (!context) return 0;
  const graphIds = graphDistractorIds(context, relations);
  const usedGraphIds = question.choices.flatMap((choice) => choice.sourceFactIds).filter((id) => graphIds.has(id));
  return clamp((usedGraphIds.length > 0 ? 0.7 : 0) + Math.min(0.3, usedGraphIds.length * 0.1));
}

function graphDistractorIds(context: QuestionGenerationContext | null | undefined, relations: KnowledgeRelation[]) {
  const allowed = new Set(context?.allowedDistractorFactIds ?? []);
  for (const relation of relations) {
    if (relation.relationType !== "CONFUSED_WITH" && relation.relationType !== "COMPARISON_PAIR") continue;
    if (relation.reviewStatus === "rejected") continue;
    allowed.add(relation.fromFactId);
    allowed.add(relation.toFactId);
  }
  allowed.delete(context?.targetFactId ?? "");
  return allowed;
}

function expectedDifficulty(score: ExamValueScore): GeneratedQuestion["difficulty"] {
  if (score.difficultyScore >= 0.7 || score.overallScore >= 0.75) return "hard";
  if (score.difficultyScore < 0.35 && score.overallScore < 0.45) return "easy";
  return "medium";
}

function duplicatePatternCounts(questions: GeneratedQuestion[]) {
  const counts = new Map<string, number>();
  for (const question of questions) {
    const key = duplicateKey(question);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function duplicationRisk(question: GeneratedQuestion, counts: Map<string, number>) {
  const count = counts.get(duplicateKey(question)) ?? 1;
  if (count >= 3) return 1;
  if (count === 2) return 0.75;
  return 0.2;
}

function duplicateKey(question: GeneratedQuestion) {
  const correct = question.choices.find((choice) => choice.isCorrect)?.text ?? "";
  return [question.trace.factId, question.templateId, normalizeText(correct)].join("|");
}

function average(values: number[]) {
  if (!values.length) return 0;
  return roundScore(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function clamp(score: number) {
  return roundScore(Math.max(0, Math.min(1, score)));
}

function roundScore(score: number) {
  return Math.round(score * 100) / 100;
}
