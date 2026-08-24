import type { ExamValueScore } from "@/domain/exam-engine/types";
import type { QuestionQualityScore } from "@/domain/exam-engine/evaluation/question-quality";
import type { AdaptivePriorityScore, LearnerKnowledgeState } from "./learner-state";
import { calculateAdaptivePriority } from "./adaptive-scorer";

export function selectAdaptiveFacts(
  learnerStates: LearnerKnowledgeState[],
  examScores: ExamValueScore[],
  limit: number,
  qualityScores: QuestionQualityScore[] = []
): AdaptivePriorityScore[] {
  const examScoreByFactId = new Map(examScores.map((score) => [score.factId, score]));
  const bestQualityByFactId = bestQualityScoresByFact(qualityScores);
  return learnerStates
    .map((state) => calculateAdaptivePriority(state, examScoreByFactId.get(state.factId), bestQualityByFactId.get(state.factId)))
    .sort((left, right) => right.priorityScore - left.priorityScore || left.factId.localeCompare(right.factId))
    .slice(0, limit);
}

function bestQualityScoresByFact(qualityScores: QuestionQualityScore[]) {
  const best = new Map<string, QuestionQualityScore>();
  for (const score of qualityScores) {
    const current = best.get(score.factId);
    if (!current || score.overallScore > current.overallScore) best.set(score.factId, score);
  }
  return best;
}
