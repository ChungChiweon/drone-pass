import type { AtomicFact, ExamValueScore, KnowledgeRelation } from "@/domain/exam-engine/types";

export type ScoreFactsForExamOptions = {
  packId?: string;
  updatedAt?: string;
};

const DEFAULT_PACK_ID = "knowledge-pack";
const DEFAULT_UPDATED_AT = "1970-01-01T00:00:00.000Z";

const WEIGHTS = {
  importanceScore: 0.3,
  confusionScore: 0.2,
  numericRiskScore: 0.2,
  penaltyRiskScore: 0.15,
  frequencyScore: 0.1,
  difficultyScore: 0.05
} as const;

const PENALTY_WORDS = ["벌금", "과태료", "징역", "취소", "정지", "처벌", "제재"];
const DUTY_WORDS = ["하여야", "금지", "필수", "의무", "승인", "신고", "등록", "허가", "제한"];
const NUMERIC_UNITS = ["kg", "킬로그램", "g", "일", "개월", "년", "세", "만원", "원", "m", "미터", "시간"];
const PENALTY_PREDICATES = ["penalty", "fine", "sanction", "suspension", "revocation", "벌칙", "과태료", "취소", "정지"];

export function scoreFactsForExam(facts: AtomicFact[], relations: KnowledgeRelation[] = [], options: ScoreFactsForExamOptions = {}): ExamValueScore[] {
  const packId = options.packId ?? DEFAULT_PACK_ID;
  const updatedAt = options.updatedAt ?? DEFAULT_UPDATED_AT;
  return facts.map((fact) => {
    const factRelations = relationsForFact(fact.id, relations);
    const frequencyScore = scoreFrequency(fact, factRelations);
    const confusionScore = scoreConfusion(factRelations);
    const importanceScore = scoreImportance(fact);
    const numericRiskScore = scoreNumericRisk(fact);
    const penaltyRiskScore = scorePenaltyRisk(fact);
    const difficultyScore = scoreDifficulty(fact, factRelations);
    const overallScore = weightedOverall({
      frequencyScore,
      confusionScore,
      importanceScore,
      numericRiskScore,
      penaltyRiskScore,
      difficultyScore
    });

    return {
      packId,
      factId: fact.id,
      frequencyScore,
      confusionScore,
      importanceScore,
      numericRiskScore,
      penaltyRiskScore,
      difficultyScore,
      overallScore,
      reason: scoreReason({
        frequencyScore,
        confusionScore,
        importanceScore,
        numericRiskScore,
        penaltyRiskScore,
        difficultyScore
      }),
      updatedAt,
      reviewStatus: "draft"
    };
  });
}

export function scoreAtomicFactsForExam(facts: AtomicFact[]) {
  return scoreFactsForExam(facts);
}

function relationsForFact(factId: string, relations: KnowledgeRelation[]) {
  return relations.filter((relation) => relation.fromFactId === factId || relation.toFactId === factId);
}

function scoreFrequency(fact: AtomicFact, relations: KnowledgeRelation[]) {
  let score = 0.2;
  if (fact.sourceReferences.length > 0) score += 0.25;
  if (fact.standaloneQuestionAllowed !== false) score += 0.2;
  if ((fact.crossReferences?.length ?? 0) > 0) score += 0.15;
  if (relations.length > 0) score += Math.min(0.2, relations.length * 0.04);
  return clamp(score);
}

function scoreConfusion(relations: KnowledgeRelation[]) {
  const confusable = relations.filter((relation) => relation.relationType === "CONFUSED_WITH").length;
  const comparable = relations.filter((relation) => relation.relationType === "COMPARISON_PAIR").length;
  return clamp((confusable * 0.3) + (comparable * 0.22));
}

function scoreImportance(fact: AtomicFact) {
  const text = factText(fact);
  let score = 0.15;
  if (matchesAny(text, DUTY_WORDS)) score += 0.35;
  if (isNumericFact(fact)) score += 0.2;
  if (matchesAny(fact.predicate, PENALTY_PREDICATES) || matchesAny(text, PENALTY_WORDS)) score += 0.25;
  if (fact.sourceReferences.length > 0) score += 0.05;
  return clamp(score);
}

function scoreNumericRisk(fact: AtomicFact) {
  let score = 0;
  if (typeof fact.value === "number") score += 0.6;
  if (fact.unit && matchesAny(fact.unit, NUMERIC_UNITS)) score += 0.3;
  if (/\d/.test(fact.statement)) score += 0.1;
  return clamp(score);
}

function scorePenaltyRisk(fact: AtomicFact) {
  const text = factText(fact);
  let score = 0;
  if (matchesAny(fact.predicate, PENALTY_PREDICATES)) score += 0.45;
  if (matchesAny(text, PENALTY_WORDS)) score += 0.55;
  return clamp(score);
}

function scoreDifficulty(fact: AtomicFact, relations: KnowledgeRelation[]) {
  let score = 0.1;
  if (fact.exceptions.length > 0 || fact.exceptionGroupReference) score += 0.35;
  score += Math.min(0.3, fact.conditions.length * 0.1);
  score += Math.min(0.25, relations.length * 0.05);
  return clamp(score);
}

function weightedOverall(scores: Omit<ExamValueScore, "packId" | "factId" | "overallScore" | "reason" | "updatedAt" | "reviewStatus">) {
  return roundScore(
    (scores.importanceScore * WEIGHTS.importanceScore)
    + (scores.confusionScore * WEIGHTS.confusionScore)
    + (scores.numericRiskScore * WEIGHTS.numericRiskScore)
    + (scores.penaltyRiskScore * WEIGHTS.penaltyRiskScore)
    + (scores.frequencyScore * WEIGHTS.frequencyScore)
    + (scores.difficultyScore * WEIGHTS.difficultyScore)
  );
}

function scoreReason(scores: Omit<ExamValueScore, "packId" | "factId" | "overallScore" | "reason" | "updatedAt" | "reviewStatus">) {
  return [
    `importance=${scores.importanceScore}`,
    `confusion=${scores.confusionScore}`,
    `numeric=${scores.numericRiskScore}`,
    `penalty=${scores.penaltyRiskScore}`,
    `frequency=${scores.frequencyScore}`,
    `difficulty=${scores.difficultyScore}`
  ].join("; ");
}

function isNumericFact(fact: AtomicFact) {
  return typeof fact.value === "number" || Boolean(fact.unit) || /\d/.test(fact.statement);
}

function factText(fact: AtomicFact) {
  return `${fact.subject} ${fact.predicate} ${String(fact.value)} ${fact.unit ?? ""} ${fact.statement}`;
}

function matchesAny(input: string, words: string[]) {
  const lower = input.toLowerCase();
  return words.some((word) => lower.includes(word.toLowerCase()));
}

function clamp(score: number) {
  return roundScore(Math.max(0, Math.min(1, score)));
}

function roundScore(score: number) {
  return Math.round(score * 100) / 100;
}
