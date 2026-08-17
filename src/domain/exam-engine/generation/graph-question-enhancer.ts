import type { KnowledgeRelation, QuestionGenerationContext, RelationType } from "@/domain/exam-engine/types";

export type ApprovedGraphQuestionContext = QuestionGenerationContext & {
  approvedRelatedFacts: string[];
  approvedConfusionFacts: string[];
  approvedExceptionFacts: string[];
  approvedComparisonFacts: string[];
  prerequisiteFacts: string[];
};

export function enhanceQuestionContext(
  context: QuestionGenerationContext,
  productionGraph: KnowledgeRelation[],
  targetFactId: string
): ApprovedGraphQuestionContext {
  const approvedRelations = relationsForFact(targetFactId, productionGraph);
  const approvedRelatedFacts = relatedIds(targetFactId, approvedRelations, ["RELATED"]);
  const approvedConfusionFacts = relatedIds(targetFactId, approvedRelations, ["CONFUSED_WITH"]);
  const approvedExceptionFacts = relatedIds(targetFactId, approvedRelations, ["EXCEPTION_OF"]);
  const approvedComparisonFacts = relatedIds(targetFactId, approvedRelations, ["COMPARISON_PAIR", "CONTRASTS_WITH"]);
  const prerequisiteFacts = relatedIds(targetFactId, approvedRelations, ["PREREQUISITE_FOR"]);

  return {
    ...context,
    relatedFactIds: unique([...context.relatedFactIds, ...approvedRelatedFacts]),
    confusionFactIds: unique([...context.confusionFactIds, ...approvedConfusionFacts]),
    exceptionFactIds: unique([...context.exceptionFactIds, ...approvedExceptionFacts]),
    comparisonFactIds: unique([...context.comparisonFactIds, ...approvedComparisonFacts]),
    prerequisiteFactIds: unique([...context.prerequisiteFactIds, ...prerequisiteFacts]),
    allowedDistractorFactIds: unique([
      ...approvedConfusionFacts,
      ...approvedComparisonFacts,
      ...context.allowedDistractorFactIds
    ]).filter((id) => !context.forbiddenDistractorFactIds.includes(id)),
    approvedRelatedFacts,
    approvedConfusionFacts,
    approvedExceptionFacts,
    approvedComparisonFacts,
    prerequisiteFacts
  };
}

function relationsForFact(factId: string, relations: KnowledgeRelation[]) {
  return relations.filter((relation) => (
    relation.reviewStatus === "approved"
    && relation.fromFactId !== relation.toFactId
    && (relation.fromFactId === factId || relation.toFactId === factId)
  ));
}

function relatedIds(factId: string, relations: KnowledgeRelation[], types: RelationType[]) {
  return unique(relations
    .filter((relation) => types.includes(relation.relationType))
    .map((relation) => relation.fromFactId === factId ? relation.toFactId : relation.fromFactId)
    .filter((id) => id !== factId));
}

function unique(ids: string[]) {
  return [...new Set(ids)];
}
