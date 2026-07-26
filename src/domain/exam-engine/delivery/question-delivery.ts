import { compileQuestion, seededShuffle } from "@/domain/exam-engine/compiler/question-compiler";
import {
  droneLawDomainPack,
  sampleAtomicFacts,
  sampleConcepts,
  sampleDistractorRules,
  sampleSourceDocuments,
  sampleSourceRevisions,
  sampleQuestionTemplates
} from "@/domain/exam-engine/samples/drone-law-sample";
import { getActiveLocalKnowledgePack } from "@/domain/exam-engine/import/local-knowledge-pack-repository";
import type { AtomicFact, GeneratedQuestion, KnowledgePack, QuestionTemplate } from "@/domain/exam-engine/types";
import { validateGeneratedQuestion } from "@/domain/exam-engine/validation/question-validator";

type DeliveryOptions = {
  examId?: string;
  subjectId?: string;
  categoryId?: string;
  seed?: string;
  limit?: number;
  questionTypes?: QuestionTemplate["questionType"][];
  knowledgePack?: KnowledgePack;
};

function isEffective(fact: AtomicFact, at = new Date()) {
  if (fact.status !== "approved") return false;
  if (fact.effectiveFrom && new Date(fact.effectiveFrom) > at) return false;
  if (fact.effectiveTo && new Date(fact.effectiveTo) < at) return false;
  return true;
}

function markValidation(question: GeneratedQuestion): GeneratedQuestion | null {
  const validation = validateGeneratedQuestion(question);
  if (!validation.ok) return null;
  return { ...question, validationStatus: "valid" };
}

function sampleKnowledgePack(): KnowledgePack {
  return {
    domainPack: droneLawDomainPack,
    sourceDocuments: sampleSourceDocuments,
    sourceRevisions: sampleSourceRevisions,
    concepts: sampleConcepts,
    atomicFacts: sampleAtomicFacts,
    questionTemplates: sampleQuestionTemplates,
    distractorRules: sampleDistractorRules
  };
}

function resolveKnowledgePack(options: DeliveryOptions) {
  return options.knowledgePack ?? getActiveLocalKnowledgePack() ?? sampleKnowledgePack();
}

function applyConditionRules(facts: AtomicFact[]) {
  const conditionRules = facts.filter((fact) => fact.factType === "CONDITION_RULE" && Array.isArray(fact.appliesTo));
  if (conditionRules.length === 0) return facts;

  return facts.map((fact) => {
    const applied = conditionRules.filter((rule) => rule.appliesTo?.includes(fact.id));
    if (applied.length === 0) return fact;
    return {
      ...fact,
      conditions: [
        ...fact.conditions,
        ...applied.map((rule) => ({
          id: `condition-rule:${rule.id}`,
          statement: rule.statement
        }))
      ]
    };
  });
}

function isStandaloneEligible(fact: AtomicFact, facts: AtomicFact[]) {
  if (fact.standaloneQuestionAllowed === false) return false;
  if (fact.factType === "CONDITION_RULE") return false;
  if (fact.factType === "COMPOSITE_FACT") {
    if (fact.groupOperator === "OR") return false;
    if (fact.groupOperator !== "AND" || !fact.groupId) return false;
    return facts.filter((item) => item.factType === "COMPOSITE_FACT" && item.groupId === fact.groupId && item.groupOperator === "AND").length >= 2;
  }
  return true;
}

export function getGeneratedQuestions(options: DeliveryOptions = {}) {
  const pack = resolveKnowledgePack(options);
  const examId = options.examId ?? pack.domainPack.exams[0]?.id ?? "unknown-exam";
  const subjectId = options.subjectId ?? pack.domainPack.subjects[0]?.id ?? "unknown-subject";
  const seed = options.seed ?? "drone-pass-sample";
  const conceptsById = Object.fromEntries(pack.concepts.map((concept) => [concept.id, concept]));
  const categoriesByConceptId = Object.fromEntries(pack.concepts.map((concept) => [concept.id, concept.categoryIds]));
  const effectiveFacts = pack.atomicFacts.filter((fact) => {
    const categories = categoriesByConceptId[fact.conceptId] ?? [];
    return isEffective(fact) && (!options.categoryId || categories.includes(options.categoryId));
  });
  const facts = applyConditionRules(effectiveFacts).filter((fact) => isStandaloneEligible(fact, effectiveFacts));
  const templates = pack.questionTemplates.filter((template) => !options.questionTypes || options.questionTypes.includes(template.questionType));

  const candidates = facts.flatMap((fact, factIndex) =>
    templates
      .map((template, templateIndex) =>
      compileQuestion({
        examId,
        subjectId,
        categoriesByConceptId,
        conceptsById,
        facts,
        fact,
        template,
        distractorRules: pack.distractorRules,
        seed: `${seed}:${factIndex}:${templateIndex}`
      })
      )
      .filter((question): question is GeneratedQuestion => Boolean(question))
  );

  const validQuestions = candidates.map(markValidation).filter((question): question is GeneratedQuestion => Boolean(question));
  const deduped = Array.from(new Map(validQuestions.map((question) => [question.id, question])).values());

  return seededShuffle(deduped, `${seed}:delivery`).slice(0, options.limit ?? deduped.length);
}

export function getMockExamSet(seed: string, limit = 10) {
  return getGeneratedQuestions({ seed, limit });
}
