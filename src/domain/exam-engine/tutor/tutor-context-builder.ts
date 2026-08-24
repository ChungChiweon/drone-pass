import type { KnowledgeRelation } from "@/domain/exam-engine/types";
import type { LearnerAnalytics } from "@/domain/exam-engine/analytics/learner-analytics";
import type { ErrorDiagnosis, TutorLearningContext } from "./error-diagnosis";

export function buildTutorLearningContext(
  errorDiagnosis: ErrorDiagnosis,
  analytics: LearnerAnalytics,
  graphRelations: KnowledgeRelation[]
): TutorLearningContext {
  const relatedRelations = graphRelations.filter((relation) => relation.fromFactId === errorDiagnosis.factId || relation.toFactId === errorDiagnosis.factId);
  const weakFacts = analytics.weakFacts.map((fact) => fact.id);
  const relatedFacts = uniqueIds([
    ...errorDiagnosis.relatedFacts,
    ...relatedRelations.map((relation) => relation.fromFactId === errorDiagnosis.factId ? relation.toFactId : relation.fromFactId)
  ]).filter((id) => id !== errorDiagnosis.factId);
  const recommendedNextFacts = uniqueIds([
    ...errorDiagnosis.recommendedReviewFacts,
    ...weakFacts,
    ...relatedFacts
  ]).slice(0, 10);

  return {
    errorDiagnosis,
    weakFacts,
    relatedFacts,
    graphRelations: relatedRelations,
    recommendedNextFacts
  };
}

function uniqueIds(ids: string[]) {
  return [...new Set(ids)];
}
