import type {
  AtomicFact,
  Concept,
  DistractorRule,
  GeneratedQuestion,
  QuestionChoice,
  QuestionTemplate
} from "@/domain/exam-engine/types";

type CompileQuestionInput = {
  examId: string;
  subjectId: string;
  categoriesByConceptId: Record<string, string[]>;
  conceptsById: Record<string, Concept>;
  facts: AtomicFact[];
  fact: AtomicFact;
  template: QuestionTemplate;
  distractorRules: DistractorRule[];
  seed: string;
};

type ChoiceDraft = {
  text: string;
  isCorrect: boolean;
  sourceFactIds: string[];
  mutationType?: DistractorRule["mutationType"] | "NATURAL_REWRITE";
};

type ParticleType = "object" | "subject" | "topic";

const allowedPlaceholders = ["concept", "statement", "subject", "value", "unit"] as const;
const unresolvedPlaceholderPattern = /{[a-zA-Z]+}/;
const boundaryOperators = new Set<AtomicFact["operator"]>(["gt", "gte", "lt", "lte"]);
const prohibitedGeneratedPhrases = [
  "기준 확인 불필요",
  "필요 기준 확인 불필요",
  "불필요 기준 확인 불필요",
  "숫자만 확인",
  "판단하지 않음",
  "조건이어도 기준 확인 불필요",
  "핵심 판단 기준",
  "상황 조건과 관계없이",
  "주변 사람",
  "현장 조종자",
  "기체 색상",
  "제조사"
];

function hasUnresolvedPlaceholder(text: string) {
  return unresolvedPlaceholderPattern.test(text);
}

function hashSeed(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: string) {
  let state = hashSeed(seed) || 1;
  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    return (state >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: T[], seed: string) {
  const random = seededRandom(seed);
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

function hasFinalConsonant(text: string) {
  const last = [...text].reverse().find((char) => /[가-힣]/.test(char));
  if (!last) return false;
  const code = last.charCodeAt(0) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0;
}

function particlePair(type: ParticleType) {
  if (type === "object") return ["을", "를"] as const;
  if (type === "subject") return ["이", "가"] as const;
  return ["은", "는"] as const;
}

function hasParticle(text: string, type: ParticleType) {
  const [withFinal, withoutFinal] = particlePair(type);
  return text.endsWith(withFinal) || text.endsWith(withoutFinal);
}

function appendParticle(text: string, type: ParticleType) {
  const trimmed = text.trim();
  if (!trimmed || hasParticle(trimmed, type)) return trimmed;
  const [withFinal, withoutFinal] = particlePair(type);
  return `${trimmed}${hasFinalConsonant(trimmed) ? withFinal : withoutFinal}`;
}

export function appendObjectParticle(text: string) {
  return appendParticle(text, "object");
}

export function appendSubjectParticle(text: string) {
  return appendParticle(text, "subject");
}

export function appendTopicParticle(text: string) {
  return appendParticle(text, "topic");
}

export function joinWithFinalParticle(items: string[], particleType: ParticleType) {
  const normalized = items.map((item) => item.trim()).filter(Boolean);
  if (normalized.length === 0) return "";
  if (normalized.length === 1) return appendParticle(normalized[0], particleType);
  return [...normalized.slice(0, -1), appendParticle(normalized[normalized.length - 1], particleType)].join(", ");
}

function splitParallelItems(text: string) {
  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function objectValueText(value: AtomicFact["value"]) {
  const text = String(value);
  const items = splitParallelItems(text);
  return items.length > 1 ? joinWithFinalParticle(items, "object") : appendObjectParticle(text);
}

function fixKoreanParticles(text: string) {
  return text
    .replaceAll("②은", "②는")
    .replaceAll("②이", "②가")
    .replace(/([가-힣A-Za-z0-9+()·/]+)(과|와)(\s)/g, (match, word: string, particle: string, space: string) => {
      if ([...word].length < 2) return match;
      return `${word}${hasFinalConsonant(word) ? "과" : "와"}${space}`;
    })
    .replace(/([가-힣A-Za-z0-9+()·/]+)(은|는)(\s)/g, (match, word: string, particle: string, space: string) => {
      if ([...word].length < 2) return match;
      return `${word}${hasFinalConsonant(word) ? "은" : "는"}${space}`;
    });
}

function sentence(text: string) {
  const trimmed = fixKoreanParticles(text.trim().replace(/(\d+)\s*킬로그램/g, "$1kg"));
  if (!trimmed) return trimmed;
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function fillTemplate(template: string, fact: AtomicFact, concept?: Concept) {
  const values: Record<(typeof allowedPlaceholders)[number], string> = {
    concept: concept?.title ?? fact.subject,
    statement: fact.statement,
    subject: fact.subject,
    value: String(fact.value),
    unit: fact.unit ?? ""
  };

  const particleAwareTemplate = template
    .replaceAll("{value}을", objectValueText(fact.value))
    .replaceAll("{value}를", objectValueText(fact.value))
    .replaceAll("{subject}이", appendSubjectParticle(fact.subject))
    .replaceAll("{subject}가", appendSubjectParticle(fact.subject))
    .replaceAll("{subject}은", appendTopicParticle(fact.subject))
    .replaceAll("{subject}는", appendTopicParticle(fact.subject));

  return fixKoreanParticles(allowedPlaceholders.reduce((text, key) => text.replaceAll(`{${key}}`, values[key]), particleAwareTemplate));
}

function isNumericFact(fact: AtomicFact) {
  return typeof fact.value === "number" && Boolean(fact.unit) && boundaryOperators.has(fact.operator);
}

function isDayUnit(unit?: string) {
  return unit === "일";
}

function isMonthUnit(unit?: string) {
  return unit === "개월";
}

function isWeightUnit(unit?: string) {
  return Boolean(unit?.toLowerCase().includes("kg") || unit?.includes("킬로그램"));
}

function displayUnit(unit?: string) {
  if (!unit) return "";
  if (isWeightUnit(unit)) return "kg";
  return unit;
}

function compatibleUnit(left?: string, right?: string) {
  if (!left || !right) return false;
  if (isDayUnit(left) || isDayUnit(right)) return isDayUnit(left) && isDayUnit(right);
  if (isMonthUnit(left) || isMonthUnit(right)) return isMonthUnit(left) && isMonthUnit(right);
  if (isWeightUnit(left) || isWeightUnit(right)) return isWeightUnit(left) && isWeightUnit(right);
  return left === right;
}

function unitValue(fact: AtomicFact, value = fact.value) {
  return `${String(value)}${displayUnit(fact.unit)}`;
}

function categoriesOverlap(left: string[], right: string[]) {
  return left.some((categoryId) => right.includes(categoryId));
}

function isDirectlyRelated(fact: AtomicFact, other: AtomicFact, categoriesByConceptId: Record<string, string[]>) {
  if (fact.id === other.id) return false;
  if (fact.conceptId === other.conceptId) return true;
  if (fact.crossReferences?.includes(other.id) || other.crossReferences?.includes(fact.id)) return true;
  if (fact.predicate === other.predicate) return true;
  if (fact.unit && compatibleUnit(fact.unit, other.unit)) return true;
  return categoriesOverlap(categoriesByConceptId[fact.conceptId] ?? [], categoriesByConceptId[other.conceptId] ?? []);
}

function relatedFacts(fact: AtomicFact, facts: AtomicFact[], categoriesByConceptId: Record<string, string[]>) {
  return uniqueFacts([
    ...facts.filter((item) => item.id !== fact.id && item.conceptId === fact.conceptId),
    ...facts.filter((item) => fact.crossReferences?.includes(item.id) || item.crossReferences?.includes(fact.id)),
    ...facts.filter((item) => item.id !== fact.id && fact.predicate === item.predicate),
    ...facts.filter((item) => item.id !== fact.id && fact.unit && compatibleUnit(fact.unit, item.unit)),
    ...facts.filter((item) => item.id !== fact.id && categoriesOverlap(categoriesByConceptId[fact.conceptId] ?? [], categoriesByConceptId[item.conceptId] ?? []))
  ]);
}

function uniqueFacts(facts: AtomicFact[]) {
  return Array.from(new Map(facts.map((fact) => [fact.id, fact])).values());
}

function hasBadGeneratedPhrase(text: string, fact: AtomicFact) {
  return prohibitedGeneratedPhrases.some((phrase) => text.includes(phrase) && !fact.statement.includes(phrase));
}

function normalizeFactStatement(fact: AtomicFact) {
  let text = fact.statement;
  if (isWeightUnit(fact.unit)) text = text.replace(/(\d+)\s*킬로그램/g, "$1kg");
  return sentence(text);
}

function numericStatement(fact: AtomicFact, value: number, operatorWord: string) {
  const unit = displayUnit(fact.unit);
  if (isWeightUnit(fact.unit)) {
    return sentence(`${fact.subject}은 최대이륙중량 ${value}${unit} ${operatorWord}일 때 ${fact.predicate}에 해당한다`);
  }
  if (isDayUnit(fact.unit)) {
    const start = fact.subject.includes("변경신고") ? "변경일" : fact.subject.includes("이전신고") ? "소유권 이전일" : "사유 발생일";
    const suffix = operatorWord === "이하" ? "이내" : operatorWord;
    return sentence(`${fact.subject}은 ${start}부터 ${value}일 ${suffix}에 하여야 한다`);
  }
  if (isMonthUnit(fact.unit)) {
    return sentence(`${fact.subject}은 ${value}개월 ${operatorWord}일 때 해당 사유가 된다`);
  }
  return sentence(`${fact.subject}은 ${value}${unit} ${operatorWord}일 때 해당한다`);
}

function operatorWord(operator?: AtomicFact["operator"]) {
  if (operator === "lte") return "이하";
  if (operator === "lt") return "미만";
  if (operator === "gte") return "이상";
  if (operator === "gt") return "초과";
  return "";
}

function boundaryOperatorSwapWord(fact: AtomicFact) {
  if (fact.operator === "lte") return "미만";
  if (fact.operator === "lt") return "이하";
  if (fact.operator === "gte") return "초과";
  if (fact.operator === "gt") return "이상";
  return null;
}

function numericNearbyValues(fact: AtomicFact, facts: AtomicFact[], categoriesByConceptId: Record<string, string[]>) {
  if (!isNumericFact(fact)) return [];
  const relatedValues = relatedFacts(fact, facts, categoriesByConceptId)
    .filter((item) => typeof item.value === "number" && compatibleUnit(fact.unit, item.unit))
    .map((item) => item.value as number)
    .filter((value) => value !== fact.value);
  if (relatedValues.length > 0) return relatedValues;

  const current = fact.value as number;
  if (isWeightUnit(fact.unit)) return [current + 1];
  if (isMonthUnit(fact.unit)) return [current + 1];
  if (isDayUnit(fact.unit)) return current === 30 ? [15] : [30];
  return [current + 1];
}

function naturalConditionDistractors(fact: AtomicFact) {
  const results: ChoiceDraft[] = [];
  if (fact.statement.includes("사업에 사용되는")) {
    results.push({
      text: sentence(fact.statement.replace("사업에 사용되는", "사업에 사용되지 않는")),
      isCorrect: false,
      sourceFactIds: [fact.id],
      mutationType: "CONDITION_OMISSION"
    });
    results.push({
      text: sentence("최대이륙중량 2kg 이하인 기체는 사용 목적과 관계없이 신고하지 않아도 된다"),
      isCorrect: false,
      sourceFactIds: [fact.id],
      mutationType: "CONDITION_OMISSION"
    });
  }
  if (fact.statement.includes("사업에 사용되지 않는")) {
    results.push({
      text: sentence(fact.statement.replace("사업에 사용되지 않는", "사업에 사용되는")),
      isCorrect: false,
      sourceFactIds: [fact.id],
      mutationType: "CONDITION_OMISSION"
    });
    results.push({
      text: sentence("최대이륙중량 2kg 이하인 사업용 기체는 신고하지 않아도 된다"),
      isCorrect: false,
      sourceFactIds: [fact.id],
      mutationType: "CONDITION_OMISSION"
    });
  }
  if (fact.statement.includes("신고 제외 대상")) {
    results.push({
      text: sentence(fact.statement.replace("신고 제외 대상이다", "신고 대상이다")),
      isCorrect: false,
      sourceFactIds: [fact.id],
      mutationType: "CONDITION_OMISSION"
    });
  }
  if (results.length === 0 && fact.conditions.length > 0) {
    results.push({
      text: sentence(`${fact.subject}은 ${fact.conditions[0].statement}에도 ${objectValueText(fact.value)} 우선적으로 확인하지 않아도 된다`),
      isCorrect: false,
      sourceFactIds: [fact.id],
      mutationType: "CONDITION_OMISSION"
    });
  }
  return results;
}

function startingPointDistractors(fact: AtomicFact, facts: AtomicFact[], categoriesByConceptId: Record<string, string[]>) {
  if (!isDayUnit(fact.unit)) return [];
  const related = relatedFacts(fact, facts, categoriesByConceptId);
  const startingPoints: string[] = related
    .map((item) => {
      if (item.statement.includes("소유권이 이전된 날")) return "소유권이 이전된 날";
      if (item.statement.includes("변경일")) return "변경일";
      if (item.statement.includes("사유가 발생한 날")) return "사유가 발생한 날";
      return null;
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));
  return uniqueStrings(startingPoints)
    .filter((point) => !fact.statement.includes(point))
    .map((point) => ({
      text: sentence(`${fact.subject}은 ${point}부터 ${unitValue(fact)} 이내에 하여야 한다`),
      isCorrect: false,
      sourceFactIds: [fact.id],
      mutationType: "CONDITION_OMISSION" as const
    }));
}

function numericDistractors(fact: AtomicFact, facts: AtomicFact[], categoriesByConceptId: Record<string, string[]>) {
  if (!isNumericFact(fact)) return [];
  const current = fact.value as number;
  const op = operatorWord(fact.operator);
  const boundary = boundaryOperatorSwapWord(fact);
  const nearby = numericNearbyValues(fact, facts, categoriesByConceptId);
  const drafts: ChoiceDraft[] = [];

  if (boundary) {
    drafts.push({
      text: numericStatement(fact, current, boundary),
      isCorrect: false,
      sourceFactIds: [fact.id],
      mutationType: "BOUNDARY_OPERATOR_SWAP"
    });
  }
  for (const value of nearby) {
    drafts.push({
      text: numericStatement(fact, value, op),
      isCorrect: false,
      sourceFactIds: [fact.id],
      mutationType: "NUMERIC_NEARBY"
    });
  }
  drafts.push(...startingPointDistractors(fact, facts, categoriesByConceptId));
  return drafts;
}

function naturalDistractors(fact: AtomicFact, facts: AtomicFact[], categoriesByConceptId: Record<string, string[]>) {
  return uniqueChoiceDrafts([
    ...numericDistractors(fact, facts, categoriesByConceptId),
    ...naturalConditionDistractors(fact),
    ...relatedFacts(fact, facts, categoriesByConceptId).map((item) => ({
      text: sentence(item.statement),
      isCorrect: false,
      sourceFactIds: [item.id],
      mutationType: "SIBLING_FACT_SWAP" as const
    }))
  ]).filter((choice) => choice.text !== normalizeFactStatement(fact));
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}

function uniqueChoiceDrafts(choices: ChoiceDraft[]) {
  const seen = new Set<string>();
  const next: ChoiceDraft[] = [];
  for (const choice of choices) {
    const normalized = sentence(choice.text);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    next.push({ ...choice, text: normalized });
  }
  return next;
}

function choice(id: string, draft: ChoiceDraft): QuestionChoice {
  return {
    id,
    text: draft.text,
    isCorrect: draft.isCorrect,
    sourceFactIds: draft.sourceFactIds,
    mutationType: draft.mutationType
  };
}

function hasUsableChoices(choices: ChoiceDraft[], fact: AtomicFact) {
  if (choices.length !== 4) return false;
  if (choices.filter((item) => item.isCorrect).length !== 1) return false;
  if (new Set(choices.map((item) => item.text)).size !== 4) return false;
  return !choices.some((item) => hasBadGeneratedPhrase(item.text, fact));
}

function buildSelectTrue(input: CompileQuestionInput, concept?: Concept) {
  const correct = { text: normalizeFactStatement(input.fact), isCorrect: true, sourceFactIds: [input.fact.id] };
  const distractors = naturalDistractors(input.fact, input.facts, input.categoriesByConceptId).filter((item) => !item.isCorrect).slice(0, 3);
  const choices = [correct, ...distractors];
  if (!hasUsableChoices(choices, input.fact)) return null;
  return {
    stem: sentence(`${concept?.title ?? input.fact.subject}에 관한 설명으로 옳은 것은?`),
    choices,
    distractorRuleIds: distractors.map((item) => item.mutationType).filter(Boolean) as string[]
  };
}

function buildSelectFalse(input: CompileQuestionInput, concept?: Concept) {
  const falseDraft = naturalDistractors(input.fact, input.facts, input.categoriesByConceptId)[0];
  if (!falseDraft) return null;
  const trueFacts = relatedFacts(input.fact, input.facts, input.categoriesByConceptId)
    .filter((item) => isDirectlyRelated(input.fact, item, input.categoriesByConceptId))
    .slice(0, 3);
  if (trueFacts.length < 3) return null;
  const choices = [
    { ...falseDraft, isCorrect: true, sourceFactIds: [input.fact.id] },
    ...trueFacts.map((item) => ({ text: normalizeFactStatement(item), isCorrect: false, sourceFactIds: [item.id] }))
  ];
  if (!hasUsableChoices(choices, input.fact)) return null;
  return {
    stem: sentence(`${concept?.title ?? input.fact.subject}에 관한 설명으로 옳지 않은 것은?`),
    choices,
    distractorRuleIds: [falseDraft.mutationType].filter(Boolean) as string[]
  };
}

function buildNumericThreshold(input: CompileQuestionInput) {
  if (!isNumericFact(input.fact)) return null;
  const current = input.fact.value as number;
  const correct = {
    text: numericStatement(input.fact, current, operatorWord(input.fact.operator)),
    isCorrect: true,
    sourceFactIds: [input.fact.id]
  };
  const distractors = numericDistractors(input.fact, input.facts, input.categoriesByConceptId).slice(0, 3);
  const choices = [correct, ...distractors];
  if (!hasUsableChoices(choices, input.fact)) return null;
  return {
    stem: sentence(`${input.fact.subject}의 수치 기준으로 옳은 것은?`),
    choices,
    distractorRuleIds: distractors.map((item) => item.mutationType).filter(Boolean) as string[]
  };
}

function comparisonLabel(fact: AtomicFact) {
  if (fact.statement.includes("사업에 사용되는")) return "2kg 이하 사업용";
  if (fact.statement.includes("사업에 사용되지 않는")) return "2kg 이하 비사업용";
  if (fact.subject.includes("변경신고")) return "변경신고";
  if (fact.subject.includes("이전신고")) return "이전신고";
  if (fact.subject.includes("말소신고 사유")) return "말소신고 사유";
  if (fact.subject.includes("말소신고")) return "말소신고";
  return fact.subject;
}

function comparisonValue(fact: AtomicFact) {
  if (fact.statement.includes("신고 대상")) return "신고 대상";
  if (fact.statement.includes("신고 의무가 없다") || fact.statement.includes("신고 제외")) return "신고 제외";
  if (isDayUnit(fact.unit)) return `${unitValue(fact)} 이내`;
  if (isMonthUnit(fact.unit)) return `${unitValue(fact)} ${operatorWord(fact.operator)}`;
  return String(fact.value);
}

function comparisonPairText(left: AtomicFact, right: AtomicFact) {
  return `${comparisonLabel(left)}: ${comparisonValue(left)} / ${comparisonLabel(right)}: ${comparisonValue(right)}`;
}

function buildConceptComparison(input: CompileQuestionInput, concept?: Concept) {
  const related = relatedFacts(input.fact, input.facts, input.categoriesByConceptId).filter((item) => isDirectlyRelated(input.fact, item, input.categoriesByConceptId));
  if (related.length < 1) return null;
  const target = input.fact;
  const partner = related[0];
  const correct = { text: sentence(comparisonPairText(target, partner)), isCorrect: true, sourceFactIds: [target.id, partner.id] };
  const candidates = [
    sentence(`${comparisonLabel(target)}: ${comparisonValue(partner)} / ${comparisonLabel(partner)}: ${comparisonValue(target)}`),
    sentence(`${comparisonLabel(target)}: ${comparisonValue(target)} / ${comparisonLabel(partner)}: ${comparisonValue(target)}`),
    sentence(`${comparisonLabel(target)}: ${comparisonValue(partner)} / ${comparisonLabel(partner)}: ${comparisonValue(partner)}`)
  ].map((text) => ({ text, isCorrect: false, sourceFactIds: [target.id, partner.id], mutationType: "SIBLING_FACT_SWAP" as const }));
  const choices = [correct, ...uniqueChoiceDrafts(candidates).slice(0, 3)];
  if (!hasUsableChoices(choices, input.fact)) return null;
  if (choices.some((item) => !item.text.includes("/"))) return null;
  return {
    stem: sentence(`${concept?.title ?? input.fact.subject}의 기준 대응으로 옳은 것은?`),
    choices,
    distractorRuleIds: ["SIBLING_FACT_SWAP"]
  };
}

function caseStem(fact: AtomicFact) {
  if (fact.id === "AF-005") return "최대이륙중량 2kg 이하인 무인동력비행장치를 비사업용으로 운용하려 한다. 이 경우 신고 여부 판단으로 옳은 것은?";
  if (fact.id === "AF-012") return "최대이륙중량 2kg 이하인 기체를 초경량비행장치사용사업에 사용하려 한다. 이 경우 장치신고에 대한 판단으로 옳은 것은?";
  if (fact.id === "AF-013") return "최대이륙중량 2kg 이하인 기체를 사업에 사용하지 않고 개인적으로 운용하려 한다. 이 경우 장치신고에 대한 판단으로 옳은 것은?";
  if (fact.id === "AF-022") return "초경량비행장치의 신고사항이 변경되었다. 이 경우 변경신고 기한으로 옳은 것은?";
  if (fact.id === "AF-026") return "초경량비행장치의 소유권이 이전되었다. 이 경우 이전신고 기한으로 옳은 것은?";
  if (fact.id === "AF-027") return "초경량비행장치 말소 사유가 발생하였다. 이 경우 말소신고 기한으로 옳은 것은?";
  if (fact.id === "AF-030") return "초경량비행장치의 존재 여부가 일정 기간 불분명하다. 이 경우 말소신고 사유 판단으로 옳은 것은?";
  if (fact.conditions.length === 0 && fact.exceptions.length === 0 && fact.factType !== "DERIVED_FACT") return null;
  return `${fact.subject}에 관하여 ${fact.conditions[0]?.statement ?? "관련 사유"}가 발생하였다. 이 경우 판단으로 옳은 것은?`;
}

function buildCaseJudgment(input: CompileQuestionInput) {
  const stem = caseStem(input.fact);
  if (!stem || !/(하려 한다|변경되었다|이전되었다|발생하였다|불분명하다|관하여)/.test(stem)) return null;
  const correct = { text: normalizeFactStatement(input.fact), isCorrect: true, sourceFactIds: [input.fact.id] };
  const distractors = naturalDistractors(input.fact, input.facts, input.categoriesByConceptId).slice(0, 3);
  const choices = [correct, ...distractors];
  if (!hasUsableChoices(choices, input.fact)) return null;
  return {
    stem: sentence(stem),
    choices,
    distractorRuleIds: distractors.map((item) => item.mutationType).filter(Boolean) as string[]
  };
}

export function isTemplateSuitableForFact(template: QuestionTemplate, fact: AtomicFact, facts: AtomicFact[], categoriesByConceptId: Record<string, string[]> = {}) {
  if (template.questionType === "NUMERIC_THRESHOLD") return isNumericFact(fact);
  if (template.questionType === "CONCEPT_COMPARISON") return relatedFacts(fact, facts, categoriesByConceptId).length >= 1;
  if (template.questionType === "CASE_JUDGMENT") return Boolean(caseStem(fact));
  return true;
}

function buildQuestionParts(input: CompileQuestionInput, concept?: Concept) {
  if (input.template.questionType === "SELECT_TRUE") return buildSelectTrue(input, concept);
  if (input.template.questionType === "SELECT_FALSE") return buildSelectFalse(input, concept);
  if (input.template.questionType === "NUMERIC_THRESHOLD") return buildNumericThreshold(input);
  if (input.template.questionType === "CONCEPT_COMPARISON") return buildConceptComparison(input, concept);
  if (input.template.questionType === "CASE_JUDGMENT") return buildCaseJudgment(input);
  return null;
}

export function compileQuestion(input: CompileQuestionInput): GeneratedQuestion | null {
  const { categoriesByConceptId, conceptsById, examId, fact, seed, subjectId, template } = input;
  if (!isTemplateSuitableForFact(template, fact, input.facts, categoriesByConceptId)) return null;

  const concept = conceptsById[fact.conceptId];
  const parts = buildQuestionParts(input, concept);
  if (!parts) return null;

  const explanation = fillTemplate(template.explanationTemplate, fact, concept);
  if (hasBadGeneratedPhrase(parts.stem, fact) || hasBadGeneratedPhrase(explanation, fact)) return null;
  if (hasUnresolvedPlaceholder(parts.stem) || hasUnresolvedPlaceholder(explanation)) return null;

  const shuffledDrafts = seededShuffle(parts.choices, `${seed}:choices:${fact.id}:${template.id}`);
  const choices = shuffledDrafts.map((draft, index) => choice(`${fact.id}:choice:${index}`, draft));

  return {
    id: `gq:${examId}:${fact.id}:${template.id}:${hashSeed(seed).toString(16)}`,
    examId,
    subjectId,
    categoryIds: categoriesByConceptId[fact.conceptId] ?? [],
    conceptIds: [fact.conceptId],
    factIds: [fact.id],
    templateId: template.id,
    stem: parts.stem,
    choices,
    explanation,
    difficulty: template.difficulty,
    sourceReferences: fact.sourceReferences,
    generatedAt: new Date().toISOString(),
    generationSeed: seed,
    validationStatus: "invalid",
    trace: {
      factId: fact.id,
      templateId: template.id,
      questionType: template.questionType,
      distractorRuleIds: uniqueStrings(parts.distractorRuleIds)
    }
  };
}
