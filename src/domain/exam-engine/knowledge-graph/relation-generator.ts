import type { AtomicFact, KnowledgeRelation, RelationType } from "@/domain/exam-engine/types";
import { validateKnowledgeRelations } from "./graph-validator";

export type GenerateKnowledgeRelationsOptions = {
  packId?: string;
  createdAt?: string;
  maxRelationsPerFact?: number;
  maxRelationsPerFactByType?: Partial<Record<RelationType, number>>;
};

const DEFAULT_PACK_ID = "knowledge-pack";
const DEFAULT_CREATED_AT = "1970-01-01T00:00:00.000Z";
const DEFAULT_MAX_RELATIONS_PER_FACT = 15;
const DEFAULT_MAX_RELATIONS_BY_TYPE: Partial<Record<RelationType, number>> = {
  CONFUSED_WITH: 4,
  COMPARISON_PAIR: 4,
  CONTRASTS_WITH: 3,
  SAME_CONCEPT: 5
};

type RelationDraft = Omit<KnowledgeRelation, "id" | "packId" | "createdAt" | "reviewStatus">;
type ScoredRelationDraft = RelationDraft & { priority: number };

export function generateKnowledgeRelations(facts: AtomicFact[], options: GenerateKnowledgeRelationsOptions = {}): KnowledgeRelation[] {
  const packId = options.packId ?? DEFAULT_PACK_ID;
  const createdAt = options.createdAt ?? DEFAULT_CREATED_AT;
  const draftRelations = [
    ...derivedFromRelations(facts),
    ...crossReferenceRelations(facts),
    ...sameConceptRelations(facts),
    ...exceptionRelations(facts),
    ...comparisonPairRelations(facts),
    ...confusedWithRelations(facts),
    ...contrastingConditionRelations(facts)
  ];
  const cappedDrafts = capRelations(draftRelations, {
    maxRelationsPerFact: options.maxRelationsPerFact ?? DEFAULT_MAX_RELATIONS_PER_FACT,
    maxRelationsPerFactByType: {
      ...DEFAULT_MAX_RELATIONS_BY_TYPE,
      ...options.maxRelationsPerFactByType
    }
  });
  const deduped = dedupeRelations(cappedDrafts.map((relation) => ({
    ...stripPriority(relation),
    id: relationId(relation.relationType, relation.fromFactId, relation.toFactId),
    packId,
    createdAt,
    reviewStatus: "draft" as const
  })));

  return validateKnowledgeRelations(facts, deduped).validRelations;
}

function stripPriority({ priority, ...draft }: ScoredRelationDraft): RelationDraft {
  void priority;
  return draft;
}

function derivedFromRelations(facts: AtomicFact[]): ScoredRelationDraft[] {
  return facts.flatMap((fact) => (fact.derivedFrom ?? []).map((sourceFactId) => ({
    fromFactId: fact.id,
    toFactId: sourceFactId,
    relationType: "DERIVED_FROM" as const,
    reason: `${fact.id} declares derivedFrom ${sourceFactId}; source derivation signal is explicit.`,
    confidence: 1,
    priority: 1
  })));
}

function crossReferenceRelations(facts: AtomicFact[]): ScoredRelationDraft[] {
  return facts.flatMap((fact) => (fact.crossReferences ?? []).map((targetFactId) => ({
    fromFactId: fact.id,
    toFactId: targetFactId,
    relationType: "RELATED" as const,
    reason: `${fact.id} cross-references ${targetFactId}; explicit cross reference signal.`,
    confidence: 0.9,
    priority: 0.95
  })));
}

function sameConceptRelations(facts: AtomicFact[]): ScoredRelationDraft[] {
  return topKPerFact(pairFacts(facts)
    .flatMap(([left, right]) => {
      if (left.conceptId !== right.conceptId) return [];
      const signals = sharedSemanticSignals(left, right);
      if (signals.length < 2) return [];
      const similarity = semanticSimilarity(left, right, signals);
      if (similarity < 0.35) return [];
      return [{
      fromFactId: left.id,
      toFactId: right.id,
      relationType: "SAME_CONCEPT" as const,
      reason: `Same concept ${left.conceptId} with ${signals.join(", ")}.`,
      confidence: roundConfidence(0.62 + (similarity * 0.18)),
      priority: similarity
      }];
    }), "SAME_CONCEPT", 5);
}

function exceptionRelations(facts: AtomicFact[]): ScoredRelationDraft[] {
  return facts.flatMap((fact) => {
    if (!fact.exceptionGroupReference) return [];
    return facts
      .filter((target) => target.groupId === fact.exceptionGroupReference && target.id !== fact.id)
      .map((target) => ({
        fromFactId: fact.id,
        toFactId: target.id,
        relationType: "EXCEPTION_OF" as const,
        reason: `${fact.id} references exception group ${fact.exceptionGroupReference}; exception contrast is explicit.`,
        confidence: 0.85,
        priority: 0.9
      }));
  });
}

function comparisonPairRelations(facts: AtomicFact[]): ScoredRelationDraft[] {
  return pairFacts(facts)
    .filter(([left, right]) => samePredicateAndUnit(left, right) && left.value !== right.value && hasComparablePurposeOrTarget(left, right))
    .map(([left, right]) => ({
      fromFactId: left.id,
      toFactId: right.id,
      relationType: "COMPARISON_PAIR" as const,
      reason: `same predicate, same unit, different numeric threshold/value, applicability contrast: ${comparisonAxis(left, right)}.`,
      confidence: confidenceForComparison(left, right),
      priority: priorityForComparison(left, right)
    }));
}

function confusedWithRelations(facts: AtomicFact[]): ScoredRelationDraft[] {
  return pairFacts(facts).flatMap(([left, right]) => {
    const sameOrSimilarPredicate = similarText(left.predicate, right.predicate) >= 0.75;
    const sameUnit = compatibleUnit(left.unit, right.unit);
    const differentValue = left.value !== right.value;
    const similarApplicability = applicabilitySimilarity(left, right) >= 0.35;
    const answerSafe = !sameStatementMeaning(left, right);
    if (!sameOrSimilarPredicate || !sameUnit || !differentValue || !similarApplicability || !answerSafe) return [];
    const numericThreshold = isNumericLike(left) && isNumericLike(right);
    const priority = (sameOrSimilarPredicate ? 0.3 : 0) + (sameUnit ? 0.2 : 0) + (numericThreshold ? 0.25 : 0) + (similarApplicability ? 0.2 : 0);
    return [{
      fromFactId: left.id,
      toFactId: right.id,
      relationType: "CONFUSED_WITH" as const,
      reason: `same/similar predicate, same unit, different value, similar applicability; safe distractor contrast.`,
      confidence: roundConfidence(0.64 + (priority * 0.22)),
      priority
    }];
  });
}

function contrastingConditionRelations(facts: AtomicFact[]): ScoredRelationDraft[] {
  return pairFacts(facts)
    .flatMap(([left, right]) => {
      const axis = contrastAxis(left, right);
      if (!axis) return [];
      return [{
      fromFactId: left.id,
      toFactId: right.id,
      relationType: "CONTRASTS_WITH" as const,
      reason: `${axis}; legal condition contrast is explicit enough for review.`,
      confidence: 0.68,
      priority: axis.includes("operator contrast") || axis.includes("allow/prohibit") ? 0.85 : 0.7
      }];
    });
}

function pairFacts(facts: AtomicFact[]) {
  const pairs: Array<[AtomicFact, AtomicFact]> = [];
  for (let leftIndex = 0; leftIndex < facts.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < facts.length; rightIndex += 1) {
      pairs.push([facts[leftIndex], facts[rightIndex]]);
    }
  }
  return pairs;
}

function samePredicateAndUnit(left: AtomicFact, right: AtomicFact) {
  return left.predicate === right.predicate && compatibleUnit(left.unit, right.unit);
}

function compatibleUnit(left?: string, right?: string) {
  return (left ?? "") === (right ?? "");
}

function capRelations(
  relations: ScoredRelationDraft[],
  options: { maxRelationsPerFact: number; maxRelationsPerFactByType: Partial<Record<RelationType, number>> }
) {
  const counts = new Map<string, number>();
  const countsByType = new Map<string, number>();
  const result: ScoredRelationDraft[] = [];
  const sorted = [...relations].sort((left, right) => relationSortScore(right) - relationSortScore(left));

  for (const relation of sorted) {
    const typeLimit = options.maxRelationsPerFactByType[relation.relationType];
    if ((counts.get(relation.fromFactId) ?? 0) >= options.maxRelationsPerFact) continue;
    if ((counts.get(relation.toFactId) ?? 0) >= options.maxRelationsPerFact) continue;
    if (typeLimit !== undefined && ((countsByType.get(`${relation.fromFactId}:${relation.relationType}`) ?? 0) >= typeLimit)) continue;
    if (typeLimit !== undefined && ((countsByType.get(`${relation.toFactId}:${relation.relationType}`) ?? 0) >= typeLimit)) continue;
    result.push(relation);
    counts.set(relation.fromFactId, (counts.get(relation.fromFactId) ?? 0) + 1);
    counts.set(relation.toFactId, (counts.get(relation.toFactId) ?? 0) + 1);
    countsByType.set(`${relation.fromFactId}:${relation.relationType}`, (countsByType.get(`${relation.fromFactId}:${relation.relationType}`) ?? 0) + 1);
    countsByType.set(`${relation.toFactId}:${relation.relationType}`, (countsByType.get(`${relation.toFactId}:${relation.relationType}`) ?? 0) + 1);
  }

  return result.sort((left, right) => left.fromFactId.localeCompare(right.fromFactId) || left.toFactId.localeCompare(right.toFactId) || left.relationType.localeCompare(right.relationType));
}

function topKPerFact(relations: ScoredRelationDraft[], type: RelationType, limit: number) {
  const sorted = [...relations].sort((left, right) => relationSortScore(right) - relationSortScore(left));
  const counts = new Map<string, number>();
  const result: ScoredRelationDraft[] = [];
  for (const relation of sorted) {
    if (relation.relationType !== type) {
      result.push(relation);
      continue;
    }
    if ((counts.get(relation.fromFactId) ?? 0) >= limit) continue;
    if ((counts.get(relation.toFactId) ?? 0) >= limit) continue;
    result.push(relation);
    counts.set(relation.fromFactId, (counts.get(relation.fromFactId) ?? 0) + 1);
    counts.set(relation.toFactId, (counts.get(relation.toFactId) ?? 0) + 1);
  }
  return result;
}

function relationSortScore(relation: ScoredRelationDraft) {
  const explicit = relation.relationType === "DERIVED_FROM" || relation.relationType === "RELATED" || relation.relationType === "EXCEPTION_OF" ? 0.25 : 0;
  return relation.confidence + relation.priority + explicit;
}

function sharedSemanticSignals(left: AtomicFact, right: AtomicFact) {
  const signals: string[] = [];
  if (similarText(left.predicate, right.predicate) >= 0.72) signals.push("same predicate");
  if (similarText(left.subject, right.subject) >= 0.55) signals.push("same subject");
  if (compatibleUnit(left.unit, right.unit) && (left.unit || right.unit)) signals.push("same unit");
  if (left.value === right.value) signals.push("same value");
  if (isNumericLike(left) && isNumericLike(right) && left.value !== right.value && compatibleUnit(left.unit, right.unit)) signals.push("different numeric threshold");
  if (conditionSimilarity(left, right) >= 0.35) signals.push("legal condition contrast");
  if (Boolean(left.exceptionGroupReference) || Boolean(right.exceptionGroupReference) || left.exceptions.length || right.exceptions.length) signals.push("exception contrast");
  return [...new Set(signals)];
}

function semanticSimilarity(left: AtomicFact, right: AtomicFact, signals = sharedSemanticSignals(left, right)) {
  let score = 0;
  score += signals.includes("same predicate") ? 0.25 : 0;
  score += signals.includes("same subject") ? 0.18 : 0;
  score += signals.includes("same unit") ? 0.14 : 0;
  score += signals.includes("different numeric threshold") ? 0.18 : 0;
  score += signals.includes("legal condition contrast") ? 0.15 : 0;
  score += signals.includes("exception contrast") ? 0.1 : 0;
  return Math.min(1, score);
}

function hasComparablePurposeOrTarget(left: AtomicFact, right: AtomicFact) {
  return similarText(left.subject, right.subject) >= 0.35
    || left.conceptId === right.conceptId
    || conditionSimilarity(left, right) >= 0.25
    || differentApplicability(left, right);
}

function comparisonAxis(left: AtomicFact, right: AtomicFact) {
  const axes = [];
  if (similarText(left.subject, right.subject) >= 0.35) axes.push("similar target");
  if (differentApplicability(left, right)) axes.push("different applicability");
  if (conditionSimilarity(left, right) >= 0.25) axes.push("similar condition");
  if (left.conceptId === right.conceptId) axes.push("same concept");
  return axes.join(", ") || "same predicate/unit";
}

function confidenceForComparison(left: AtomicFact, right: AtomicFact) {
  return roundConfidence(0.68 + (isNumericLike(left) && isNumericLike(right) ? 0.12 : 0) + (conditionSimilarity(left, right) * 0.1));
}

function priorityForComparison(left: AtomicFact, right: AtomicFact) {
  return 0.45 + (isNumericLike(left) && isNumericLike(right) ? 0.25 : 0) + (similarText(left.subject, right.subject) * 0.15) + (conditionSimilarity(left, right) * 0.15);
}

function contrastAxis(left: AtomicFact, right: AtomicFact) {
  const sameJudgmentAxis = similarText(left.predicate, right.predicate) >= 0.72 || left.conceptId === right.conceptId;
  if (!sameJudgmentAxis) return null;
  if (operatorContrast(left, right)) return "operator contrast: 이상/이하/초과/미만 or equality boundary differs";
  if (allowProhibitContrast(left, right)) return "allow/prohibit applicability contrast";
  if (Boolean(left.exceptionGroupReference) !== Boolean(right.exceptionGroupReference) && similarText(left.subject, right.subject) >= 0.35) return "exception contrast with similar subject";
  if (conditionSimilarity(left, right) >= 0.4 && (left.conditions.length !== right.conditions.length || left.exceptions.length !== right.exceptions.length)) return "legal condition contrast with similar condition text";
  return null;
}

function operatorContrast(left: AtomicFact, right: AtomicFact) {
  if (!left.operator || !right.operator || left.operator === right.operator) return false;
  return compatibleUnit(left.unit, right.unit) && similarText(left.predicate, right.predicate) >= 0.7;
}

function allowProhibitContrast(left: AtomicFact, right: AtomicFact) {
  const leftText = factText(left);
  const rightText = factText(right);
  return /금지|불허|제한|없다|아니/.test(leftText) && /가능|허용|대상|있다|하여야/.test(rightText)
    || /금지|불허|제한|없다|아니/.test(rightText) && /가능|허용|대상|있다|하여야/.test(leftText);
}

function applicabilitySimilarity(left: AtomicFact, right: AtomicFact) {
  return Math.max(similarText(left.subject, right.subject), conditionSimilarity(left, right), left.conceptId === right.conceptId ? 0.45 : 0);
}

function differentApplicability(left: AtomicFact, right: AtomicFact) {
  return left.subject !== right.subject || JSON.stringify(left.appliesTo ?? []) !== JSON.stringify(right.appliesTo ?? []);
}

function sameStatementMeaning(left: AtomicFact, right: AtomicFact) {
  return normalizeText(left.statement) === normalizeText(right.statement) || (left.predicate === right.predicate && left.value === right.value && compatibleUnit(left.unit, right.unit));
}

function isNumericLike(fact: AtomicFact) {
  return typeof fact.value === "number" || Boolean(fact.unit) || /\d/.test(fact.statement);
}

function conditionSimilarity(left: AtomicFact, right: AtomicFact) {
  const leftText = [...left.conditions.map((condition) => condition.statement), ...left.exceptions.map((exceptionItem) => exceptionItem.statement)].join(" ");
  const rightText = [...right.conditions.map((condition) => condition.statement), ...right.exceptions.map((exceptionItem) => exceptionItem.statement)].join(" ");
  if (!leftText || !rightText) return 0;
  return similarText(leftText, rightText);
}

function similarText(left: string, right: string) {
  const leftTokens = tokenSet(left);
  const rightTokens = tokenSet(right);
  if (!leftTokens.size || !rightTokens.size) return left === right ? 1 : 0;
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return intersection / union;
}

function tokenSet(value: string) {
  const normalized = normalizeText(value);
  const tokens = normalized.match(/[가-힣a-zA-Z0-9]+/g) ?? [];
  const grams = new Set(tokens.flatMap((token) => token.length <= 2 ? [token] : Array.from({ length: token.length - 1 }, (_, index) => token.slice(index, index + 2))));
  return grams;
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function factText(fact: AtomicFact) {
  return `${fact.subject} ${fact.predicate} ${String(fact.value)} ${fact.unit ?? ""} ${fact.statement}`;
}

function roundConfidence(value: number) {
  return Math.round(Math.max(0, Math.min(1, value)) * 100) / 100;
}

function dedupeRelations(relations: KnowledgeRelation[]) {
  return [...new Map(relations.map((relation) => [relation.id, relation])).values()];
}

function relationId(type: RelationType, fromFactId: string, toFactId: string) {
  return `KG-${type}-${fromFactId}-${toFactId}`;
}
