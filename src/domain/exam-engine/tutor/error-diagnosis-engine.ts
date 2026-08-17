import type { GeneratedQuestion, QuestionGenerationContext } from "@/domain/exam-engine/types";
import type { LearnerKnowledgeState } from "@/domain/exam-engine/adaptive/learner-state";
import type { ErrorDiagnosis, ErrorType } from "./error-diagnosis";

export function diagnoseError(
  question: GeneratedQuestion,
  selectedAnswer: string,
  correctAnswer: string,
  context: QuestionGenerationContext | null | undefined,
  learnerState: LearnerKnowledgeState | null | undefined
): ErrorDiagnosis {
  const selected = question.choices.find((choice) => choice.id === selectedAnswer || choice.text === selectedAnswer);
  const correct = question.choices.find((choice) => choice.id === correctAnswer || choice.text === correctAnswer || choice.isCorrect);
  const selectedFactIds = selected?.sourceFactIds ?? [];
  const type = classifyError(selected?.text ?? selectedAnswer, correct?.text ?? correctAnswer, selectedFactIds, context, learnerState);
  const recommendedReviewFacts = recommendedFacts(question.trace.factId, selectedFactIds, context);

  return {
    learnerId: learnerState?.learnerId ?? "",
    questionId: question.id,
    factId: question.trace.factId,
    conceptId: question.conceptIds[0] ?? "",
    errorType: type,
    errorReason: reasonFor(type),
    confusionFacts: selectedFactIds.filter((id) => context?.confusionFactIds.includes(id)),
    relatedFacts: uniqueIds([
      ...(context?.relatedFactIds ?? []),
      ...(context?.comparisonFactIds ?? []),
      ...selectedFactIds
    ]).filter((id) => id !== question.trace.factId),
    recommendedReviewFacts,
    confidence: confidenceFor(type, context, learnerState, selectedFactIds)
  };
}

function classifyError(
  selectedText: string,
  correctText: string,
  selectedFactIds: string[],
  context: QuestionGenerationContext | null | undefined,
  learnerState: LearnerKnowledgeState | null | undefined
): ErrorType {
  if (selectedFactIds.some((id) => context?.exceptionFactIds.includes(id)) || context?.exceptionFactIds.some((id) => selectedFactIds.includes(id))) return "EXCEPTION_MISSED";
  if (hasNumericDifference(selectedText, correctText)) return "NUMERIC_MISTAKE";
  if (selectedFactIds.some((id) => context?.confusionFactIds.includes(id))) return "CONCEPT_CONFUSION";
  if ((learnerState?.masteryScore ?? 1) < 0.45) return "KNOWLEDGE_GAP";
  return "CARELESS_ERROR";
}

function recommendedFacts(targetFactId: string, selectedFactIds: string[], context: QuestionGenerationContext | null | undefined) {
  return uniqueIds([
    targetFactId,
    ...selectedFactIds,
    ...(context?.exceptionFactIds ?? []),
    ...(context?.confusionFactIds ?? []),
    ...(context?.prerequisiteFactIds ?? [])
  ]);
}

function hasNumericDifference(left: string, right: string) {
  const leftNumbers = numbers(left);
  const rightNumbers = numbers(right);
  if (!leftNumbers.length || !rightNumbers.length) return false;
  return leftNumbers.join("|") !== rightNumbers.join("|") || unit(left) !== unit(right);
}

function numbers(value: string) {
  return value.match(/\d+(?:\.\d+)?/g) ?? [];
}

function unit(value: string) {
  const match = value.match(/(kg|킬로그램|g|일|개월|년|세|만원|원|m|미터|시간)/i);
  return match?.[1].toLowerCase() ?? "";
}

function reasonFor(type: ErrorType) {
  if (type === "CONCEPT_CONFUSION") return "Selected answer is linked to a graph confusion fact.";
  if (type === "NUMERIC_MISTAKE") return "Selected answer differs by numeric value or unit.";
  if (type === "EXCEPTION_MISSED") return "Selected answer indicates an exception rule was missed.";
  if (type === "KNOWLEDGE_GAP") return "Learner mastery for the target fact is low.";
  return "No strong graph or mastery signal; likely a careless mistake.";
}

function confidenceFor(
  type: ErrorType,
  context: QuestionGenerationContext | null | undefined,
  learnerState: LearnerKnowledgeState | null | undefined,
  selectedFactIds: string[]
) {
  if (type === "EXCEPTION_MISSED" && selectedFactIds.some((id) => context?.exceptionFactIds.includes(id))) return 0.9;
  if (type === "CONCEPT_CONFUSION" && selectedFactIds.some((id) => context?.confusionFactIds.includes(id))) return 0.85;
  if (type === "NUMERIC_MISTAKE") return 0.8;
  if (type === "KNOWLEDGE_GAP" && (learnerState?.masteryScore ?? 1) < 0.3) return 0.85;
  return 0.6;
}

function uniqueIds(ids: string[]) {
  return [...new Set(ids)];
}
