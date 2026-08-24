import type { FactCandidate } from "@/domain/exam-engine/knowledge-ingestion/knowledge-ingestion";
import type { QuestionTemplate } from "@/domain/exam-engine/types";
import type { QuestionYieldPrediction } from "./expansion-intelligence";

export function predictQuestionYield(
  candidate: FactCandidate,
  questionTemplates: QuestionTemplate[],
  graphPotential = 0
): QuestionYieldPrediction {
  const expectedTemplates = questionTemplates.filter((template) => templateMatchesCandidate(template, candidate)).map((template) => template.id);
  const difficultyRange = [...new Set(questionTemplates.filter((template) => expectedTemplates.includes(template.id)).map((template) => template.difficulty))];
  const distractorPotential = round(Math.min(1,
    (candidate.extractedNumbers.length > 0 ? 0.25 : 0) +
    (candidate.extractedConditions.length > 0 ? 0.2 : 0) +
    (candidate.extractedExceptions.length > 0 ? 0.2 : 0) +
    (candidate.conceptHint ? 0.1 : 0) +
    graphPotential * 0.25
  ));

  return {
    expectedQuestions: Math.max(1, Math.min(expectedTemplates.length + Math.round(distractorPotential), questionTemplates.length)),
    expectedTemplates,
    difficultyRange,
    distractorPotential
  };
}

export function questionYieldScore(prediction: QuestionYieldPrediction, templateCount: number) {
  const templateScore = templateCount === 0 ? 0 : prediction.expectedTemplates.length / templateCount;
  const questionScore = Math.min(1, prediction.expectedQuestions / Math.max(1, templateCount));
  return round(Math.min(1, (templateScore * 0.55) + (questionScore * 0.25) + (prediction.distractorPotential * 0.2)));
}

function templateMatchesCandidate(template: QuestionTemplate, candidate: FactCandidate) {
  if (template.questionType === "NUMERIC_THRESHOLD") return candidate.extractedNumbers.length > 0;
  if (template.questionType === "CASE_JUDGMENT") return candidate.extractedConditions.length > 0 || candidate.extractedExceptions.length > 0;
  if (template.questionType === "CONCEPT_COMPARISON") return Boolean(candidate.conceptHint) || candidate.extractedNumbers.length > 0;
  return Boolean(candidate.statement.trim());
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}
