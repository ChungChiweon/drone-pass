import type { AtomicFact, KnowledgeRelation } from "@/domain/exam-engine/types";

export type KnowledgeGraphValidationIssue = {
  code: "MISSING_FROM_FACT" | "MISSING_TO_FACT" | "SELF_RELATION" | "INVALID_CONFIDENCE";
  relationId: string;
  message: string;
};

export type KnowledgeGraphValidationResult = {
  validRelations: KnowledgeRelation[];
  issues: KnowledgeGraphValidationIssue[];
};

export function validateKnowledgeRelations(facts: AtomicFact[], relations: KnowledgeRelation[]): KnowledgeGraphValidationResult {
  const factIds = new Set(facts.map((fact) => fact.id));
  const issues: KnowledgeGraphValidationIssue[] = [];
  const validRelations: KnowledgeRelation[] = [];

  for (const relation of relations) {
    const relationIssues = validateRelation(relation, factIds);
    if (relationIssues.length) {
      issues.push(...relationIssues);
    } else {
      validRelations.push(relation);
    }
  }

  return { validRelations, issues };
}

function validateRelation(relation: KnowledgeRelation, factIds: Set<string>) {
  const issues: KnowledgeGraphValidationIssue[] = [];
  if (!factIds.has(relation.fromFactId)) {
    issues.push({
      code: "MISSING_FROM_FACT",
      relationId: relation.id,
      message: `fromFactId does not exist: ${relation.fromFactId}`
    });
  }
  if (!factIds.has(relation.toFactId)) {
    issues.push({
      code: "MISSING_TO_FACT",
      relationId: relation.id,
      message: `toFactId does not exist: ${relation.toFactId}`
    });
  }
  if (relation.fromFactId === relation.toFactId) {
    issues.push({
      code: "SELF_RELATION",
      relationId: relation.id,
      message: "self relation is not allowed"
    });
  }
  if (relation.confidence < 0 || relation.confidence > 1) {
    issues.push({
      code: "INVALID_CONFIDENCE",
      relationId: relation.id,
      message: "confidence must be between 0 and 1"
    });
  }
  return issues;
}
