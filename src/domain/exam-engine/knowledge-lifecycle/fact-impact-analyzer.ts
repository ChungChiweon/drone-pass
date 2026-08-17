import type { Concept, GeneratedQuestion, KnowledgeRelation } from "@/domain/exam-engine/types";
import type { FactImpactReport, FactImpactRiskLevel } from "./knowledge-lifecycle";

export function analyzeFactImpact(
  factId: string,
  relations: KnowledgeRelation[] = [],
  questions: GeneratedQuestion[] = [],
  concepts: Concept[] = []
): FactImpactReport {
  const affectedRelations = relations
    .filter((relation) => relation.fromFactId === factId || relation.toFactId === factId)
    .map((relation) => relation.id);
  const affectedQuestions = questions
    .filter((question) => question.factIds.includes(factId) || question.trace.factId === factId || question.choices.some((choice) => choice.sourceFactIds.includes(factId)))
    .map((question) => question.id);
  const affectedConceptIds = new Set<string>();
  for (const question of questions) {
    if (question.factIds.includes(factId) || question.trace.factId === factId) {
      question.conceptIds.forEach((conceptId) => affectedConceptIds.add(conceptId));
    }
  }
  const affectedConcepts = concepts
    .filter((concept) => affectedConceptIds.has(concept.id))
    .map((concept) => concept.id);
  const examScore = scoreImpact(affectedRelations.length, affectedQuestions.length, affectedConcepts.length);

  return {
    factId,
    affectedRelations,
    affectedQuestions,
    affectedConcepts,
    examScore,
    riskLevel: riskLevel(examScore, affectedRelations.length, affectedQuestions.length)
  };
}

function scoreImpact(relationCount: number, questionCount: number, conceptCount: number) {
  return Math.min(1, Math.round(((relationCount * 0.08) + (questionCount * 0.18) + (conceptCount * 0.12)) * 100) / 100);
}

function riskLevel(score: number, relationCount: number, questionCount: number): FactImpactRiskLevel {
  if (score >= 0.7 || questionCount >= 4 || relationCount >= 8) return "high";
  if (score >= 0.35 || questionCount >= 2 || relationCount >= 3) return "medium";
  return "low";
}
