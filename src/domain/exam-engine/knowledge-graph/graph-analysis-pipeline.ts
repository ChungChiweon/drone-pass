import type { AtomicFact, KnowledgeRelation, RelationType } from "@/domain/exam-engine/types";
import { generateKnowledgeRelations } from "./relation-generator";
import { validateKnowledgeRelations } from "./graph-validator";
import { relationPriorityValue } from "./relation-ranking";

export type RelationSummary = Record<RelationType, number>;

export type GraphAnalysisResult = {
  packId: string;
  totalFacts: number;
  generatedRelations: KnowledgeRelation[];
  validatedRelations: KnowledgeRelation[];
  rejectedRelations: KnowledgeRelation[];
  relationSummary: RelationSummary;
};

const MIN_RELATION_CONFIDENCE = 0.6;

export function analyzeKnowledgeGraph(packId: string, facts: AtomicFact[]): GraphAnalysisResult {
  const generatedRelations = generateKnowledgeRelations(facts, { packId });
  const validation = validateKnowledgeRelations(facts, generatedRelations);
  const deduped = dedupeRelations(validation.validRelations);
  const validatedRelations = deduped
    .filter((relation) => relation.confidence >= MIN_RELATION_CONFIDENCE)
    .toSorted((left, right) => relationPriorityValue(right) - relationPriorityValue(left));
  const validatedIds = new Set(validatedRelations.map((relation) => relation.id));
  const rejectedRelations = generatedRelations.filter((relation) => !validatedIds.has(relation.id));

  return {
    packId,
    totalFacts: facts.length,
    generatedRelations,
    validatedRelations,
    rejectedRelations,
    relationSummary: summarizeRelations(validatedRelations)
  };
}

function summarizeRelations(relations: KnowledgeRelation[]): RelationSummary {
  return {
    RELATED: countType(relations, "RELATED"),
    CONFUSED_WITH: countType(relations, "CONFUSED_WITH"),
    CONTRASTS_WITH: countType(relations, "CONTRASTS_WITH"),
    PREREQUISITE_FOR: countType(relations, "PREREQUISITE_FOR"),
    EXCEPTION_OF: countType(relations, "EXCEPTION_OF"),
    DERIVED_FROM: countType(relations, "DERIVED_FROM"),
    SAME_CONCEPT: countType(relations, "SAME_CONCEPT"),
    COMPARISON_PAIR: countType(relations, "COMPARISON_PAIR"),
    APPLIES_TO: countType(relations, "APPLIES_TO")
  };
}

function countType(relations: KnowledgeRelation[], type: RelationType) {
  return relations.filter((relation) => relation.relationType === type).length;
}

function dedupeRelations(relations: KnowledgeRelation[]) {
  const seen = new Set<string>();
  const deduped: KnowledgeRelation[] = [];
  for (const relation of relations) {
    const key = relationKey(relation);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(relation);
  }
  return deduped;
}

function relationKey(relation: KnowledgeRelation) {
  const endpoints = [relation.fromFactId, relation.toFactId].sort().join("::");
  return `${relation.relationType}:${endpoints}`;
}
