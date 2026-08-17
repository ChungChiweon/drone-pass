import type {
  AtomicFact,
  ExamValueScore,
  KnowledgeRelation,
  QuestionGenerationContext,
  QuestionType,
  RelationType
} from "@/domain/exam-engine/types";

export type QuestionContextProvider = {
  getContext(factId: string): QuestionGenerationContext | null;
};

export function buildQuestionGenerationContext(
  factId: string,
  facts: AtomicFact[],
  relations: KnowledgeRelation[],
  scores: ExamValueScore[] = []
): QuestionGenerationContext | null {
  const targetFact = facts.find((fact) => fact.id === factId);
  if (!targetFact) return null;

  const factRelations = relations.filter((relation) => relation.fromFactId === factId || relation.toFactId === factId);
  const rejectedRelationTargets = relatedFactIds(factId, factRelations.filter((relation) => relation.reviewStatus === "rejected"));
  const byType = (types: RelationType[]) => relatedFactIds(factId, factRelations.filter((relation) => types.includes(relation.relationType) && relation.reviewStatus !== "rejected"));
  const confusionFactIds = byType(["CONFUSED_WITH"]);
  const comparisonFactIds = byType(["COMPARISON_PAIR", "CONTRASTS_WITH"]);
  const allowedDistractorFactIds = uniqueIds([...confusionFactIds, ...comparisonFactIds]).filter((id) => !rejectedRelationTargets.includes(id));

  return {
    targetFactId: factId,
    relatedFactIds: byType(["RELATED"]),
    confusionFactIds,
    prerequisiteFactIds: byType(["PREREQUISITE_FOR"]),
    exceptionFactIds: byType(["EXCEPTION_OF"]),
    comparisonFactIds,
    difficulty: difficultyFromScore(scores.find((score) => score.factId === factId)),
    questionType: questionTypeForFact(targetFact, comparisonFactIds),
    allowedDistractorFactIds,
    forbiddenDistractorFactIds: rejectedRelationTargets
  };
}

export function createStaticQuestionContextProvider(
  facts: AtomicFact[],
  relations: KnowledgeRelation[],
  scores: ExamValueScore[] = []
): QuestionContextProvider {
  return {
    getContext(factId: string) {
      return buildQuestionGenerationContext(factId, facts, relations, scores);
    }
  };
}

function relatedFactIds(factId: string, relations: KnowledgeRelation[]) {
  return uniqueIds(relations.map((relation) => relation.fromFactId === factId ? relation.toFactId : relation.fromFactId));
}

function uniqueIds(ids: string[]) {
  return [...new Set(ids)];
}

function difficultyFromScore(score?: ExamValueScore): QuestionGenerationContext["difficulty"] {
  if (!score) return "medium";
  if (score.difficultyScore >= 0.7 || score.overallScore >= 0.75) return "hard";
  if (score.difficultyScore < 0.35 && score.overallScore < 0.45) return "easy";
  return "medium";
}

function questionTypeForFact(fact: AtomicFact, comparisonFactIds: string[]): QuestionType {
  if (comparisonFactIds.length > 0) return "CONCEPT_COMPARISON";
  if (typeof fact.value === "number") return "NUMERIC_THRESHOLD";
  return "SELECT_TRUE";
}
