import type { KnowledgeRelation, QuestionType, RelationType } from "@/domain/exam-engine/types";

export type QuestionGenerationHint = {
  suggestedQuestionType: QuestionType;
  relationType: RelationType | null;
  reason: string;
};

export function selectQuestionTypeHint(targetFactId: string, productionGraph: KnowledgeRelation[]): QuestionGenerationHint {
  const relations = productionGraph.filter((relation) => (
    relation.reviewStatus === "approved"
    && relation.fromFactId !== relation.toFactId
    && (relation.fromFactId === targetFactId || relation.toFactId === targetFactId)
  ));

  if (hasType(relations, "CONFUSED_WITH")) {
    return { suggestedQuestionType: "CONCEPT_COMPARISON", relationType: "CONFUSED_WITH", reason: "Approved CONFUSED_WITH relation supports a comparison-style item." };
  }
  if (hasType(relations, "EXCEPTION_OF")) {
    return { suggestedQuestionType: "CASE_JUDGMENT", relationType: "EXCEPTION_OF", reason: "Approved EXCEPTION_OF relation supports an exception judgment item." };
  }
  if (hasType(relations, "COMPARISON_PAIR")) {
    return { suggestedQuestionType: "CONCEPT_COMPARISON", relationType: "COMPARISON_PAIR", reason: "Approved COMPARISON_PAIR relation supports threshold/basis comparison." };
  }
  if (hasType(relations, "PREREQUISITE_FOR")) {
    return { suggestedQuestionType: "CASE_JUDGMENT", relationType: "PREREQUISITE_FOR", reason: "Approved PREREQUISITE_FOR relation supports order or condition judgment." };
  }
  return { suggestedQuestionType: "SELECT_TRUE", relationType: null, reason: "No approved graph relation suggests a specialized question type." };
}

function hasType(relations: KnowledgeRelation[], type: RelationType) {
  return relations.some((relation) => relation.relationType === type);
}
