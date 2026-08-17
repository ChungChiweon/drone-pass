import type { ExamValueScore, GeneratedQuestion } from "@/domain/exam-engine/types";
import type { QuestionQualityScore } from "@/domain/exam-engine/evaluation/question-quality";
import type {
  BalanceEntry,
  ExamBlueprint,
  ExamSelectionCandidate,
  ExamSelectionResult
} from "./exam-selection";

type CandidateWithQuestion = ExamSelectionCandidate & {
  question: GeneratedQuestion;
};

const DEFAULT_MIN_QUALITY_SCORE = 0.6;

export function selectExamQuestions(
  questions: GeneratedQuestion[],
  blueprint: ExamBlueprint,
  qualityScores: QuestionQualityScore[],
  examValueScores: ExamValueScore[]
): ExamSelectionResult {
  const qualityByQuestionId = new Map(qualityScores.map((score) => [score.questionId, score]));
  const examValueByFactId = new Map(examValueScores.map((score) => [score.factId, score]));
  const categoryTargets = targetCounts(Object.fromEntries(blueprint.categoryDistribution.map((entry) => [entry.categoryId, entry.ratio])), blueprint.examSize);
  const difficultyTargets = targetCounts(blueprint.difficultyDistribution, blueprint.examSize);
  const candidates = questions
    .map((question) => toCandidate(question, qualityByQuestionId.get(question.id), examValueByFactId.get(question.trace.factId || question.factIds[0])))
    .filter((candidate): candidate is CandidateWithQuestion => Boolean(candidate))
    .filter((candidate) => candidate.qualityScore >= (blueprint.minQualityScore ?? DEFAULT_MIN_QUALITY_SCORE))
    .sort(candidateSort);

  const selected: CandidateWithQuestion[] = [];
  const conceptCounts = new Map<string, number>();
  const factCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  const difficultyCounts = new Map<GeneratedQuestion["difficulty"], number>();

  for (const candidate of candidates) {
    if (selected.length >= blueprint.examSize) break;
    if ((factCounts.get(candidate.factId) ?? 0) >= blueprint.maxFactRepeat) continue;
    if ((conceptCounts.get(candidate.conceptId) ?? 0) >= blueprint.maxConceptRepeat) continue;
    if (!fitsTarget(candidate.categoryId, categoryCounts, categoryTargets, selected.length, blueprint.examSize)) continue;
    if (!fitsTarget(candidate.difficulty, difficultyCounts, difficultyTargets, selected.length, blueprint.examSize)) continue;
    select(candidate);
  }

  for (const candidate of candidates) {
    if (selected.length >= blueprint.examSize) break;
    if (selected.some((item) => item.questionId === candidate.questionId)) continue;
    if ((factCounts.get(candidate.factId) ?? 0) >= blueprint.maxFactRepeat) continue;
    if ((conceptCounts.get(candidate.conceptId) ?? 0) >= blueprint.maxConceptRepeat) continue;
    select(candidate);
  }

  function select(candidate: CandidateWithQuestion) {
    selected.push(candidate);
    factCounts.set(candidate.factId, (factCounts.get(candidate.factId) ?? 0) + 1);
    conceptCounts.set(candidate.conceptId, (conceptCounts.get(candidate.conceptId) ?? 0) + 1);
    categoryCounts.set(candidate.categoryId, (categoryCounts.get(candidate.categoryId) ?? 0) + 1);
    difficultyCounts.set(candidate.difficulty, (difficultyCounts.get(candidate.difficulty) ?? 0) + 1);
  }

  const questionsOnly = selected.map(toSelectionCandidate);
  return {
    questions: questionsOnly,
    totalCount: questionsOnly.length,
    categoryBalance: balance(categoryTargets, categoryCounts),
    difficultyBalance: balance(difficultyTargets, difficultyCounts) as Record<GeneratedQuestion["difficulty"], BalanceEntry>,
    duplicateWarnings: duplicateWarnings(questionsOnly, blueprint),
    averageQualityScore: average(questionsOnly.map((question) => question.qualityScore)),
    averageExamValueScore: average(questionsOnly.map((question) => question.examValueScore))
  };
}

function toSelectionCandidate(candidate: CandidateWithQuestion): ExamSelectionCandidate {
  return {
    questionId: candidate.questionId,
    factId: candidate.factId,
    categoryId: candidate.categoryId,
    conceptId: candidate.conceptId,
    qualityScore: candidate.qualityScore,
    examValueScore: candidate.examValueScore,
    difficulty: candidate.difficulty,
    isNew: candidate.isNew,
    selectedReason: candidate.selectedReason
  };
}

function toCandidate(
  question: GeneratedQuestion,
  quality: QuestionQualityScore | undefined,
  examValue: ExamValueScore | undefined
): CandidateWithQuestion | null {
  if (!quality || quality.reviewStatus === "rejected") return null;
  const factId = question.trace.factId || question.factIds[0];
  const categoryId = question.categoryIds[0] ?? "uncategorized";
  const conceptId = question.conceptIds[0] ?? "unknown-concept";
  const qualityScore = quality.overallScore;
  const examValueScore = examValue?.overallScore ?? 0;
  const isNew = quality.reviewStatus === "draft";
  return {
    question,
    questionId: question.id,
    factId,
    categoryId,
    conceptId,
    qualityScore,
    examValueScore,
    difficulty: question.difficulty,
    isNew,
    selectedReason: [
      `quality=${qualityScore.toFixed(2)}`,
      `examValue=${examValueScore.toFixed(2)}`,
      `difficulty=${question.difficulty}`,
      `category=${categoryId}`
    ].join("; ")
  };
}

function candidateSort(left: CandidateWithQuestion, right: CandidateWithQuestion) {
  const leftScore = (left.qualityScore * 0.58) + (left.examValueScore * 0.34) + (left.isNew ? 0 : 0.08);
  const rightScore = (right.qualityScore * 0.58) + (right.examValueScore * 0.34) + (right.isNew ? 0 : 0.08);
  return rightScore - leftScore || left.questionId.localeCompare(right.questionId);
}

function targetCounts(distribution: Record<string, number>, total: number) {
  const entries = Object.entries(distribution);
  if (!entries.length) return {};
  const targets = Object.fromEntries(entries.map(([id, ratio]) => [id, Math.floor(total * ratio)]));
  let assigned = Object.values(targets).reduce((sum, value) => sum + value, 0);
  const byRemainder = entries
    .map(([id, ratio]) => ({ id, remainder: (total * ratio) - Math.floor(total * ratio) }))
    .sort((left, right) => right.remainder - left.remainder);
  for (const entry of byRemainder) {
    if (assigned >= total) break;
    targets[entry.id] += 1;
    assigned += 1;
  }
  return targets;
}

function fitsTarget(id: string, counts: Map<string, number>, targets: Record<string, number>, selectedCount: number, examSize: number) {
  if (!Object.keys(targets).length) return true;
  const target = targets[id] ?? 0;
  const current = counts.get(id) ?? 0;
  const remainingSlots = examSize - selectedCount;
  const unmetTargets = Object.entries(targets).reduce((sum, [targetId, targetCount]) => sum + Math.max(0, targetCount - (counts.get(targetId) ?? 0)), 0);
  if (current < target) return true;
  return remainingSlots > unmetTargets;
}

function balance(targets: Record<string, number>, counts: Map<string, number>) {
  const keys = new Set([...Object.keys(targets), ...Array.from(counts.keys())]);
  return Object.fromEntries(Array.from(keys).map((key) => {
    const actual = counts.get(key) ?? 0;
    const target = targets[key] ?? 0;
    return [key, { target, actual, ratio: target ? round(actual / target) : actual ? 1 : 0 }];
  }));
}

function duplicateWarnings(questions: ExamSelectionCandidate[], blueprint: ExamBlueprint) {
  const warnings: string[] = [];
  const conceptCounts = countBy(questions.map((question) => question.conceptId));
  const factCounts = countBy(questions.map((question) => question.factId));
  for (const [conceptId, count] of conceptCounts) {
    if (count > blueprint.maxConceptRepeat) warnings.push(`Concept repeat exceeded: ${conceptId} (${count}/${blueprint.maxConceptRepeat})`);
  }
  for (const [factId, count] of factCounts) {
    if (count > blueprint.maxFactRepeat) warnings.push(`Fact repeat exceeded: ${factId} (${count}/${blueprint.maxFactRepeat})`);
  }
  return warnings;
}

function countBy(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
