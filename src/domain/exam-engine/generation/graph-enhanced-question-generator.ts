import { compileQuestion } from "@/domain/exam-engine/compiler/question-compiler";
import type {
  AtomicFact,
  Concept,
  DistractorRule,
  ExamValueScore,
  GeneratedQuestion,
  KnowledgeRelation,
  QuestionTemplate
} from "@/domain/exam-engine/types";
import { buildQuestionGenerationContext } from "./question-generation-context-builder";
import { enhanceQuestionContext } from "./graph-question-enhancer";
import { selectQuestionTypeHint, type QuestionGenerationHint } from "./question-type-selector";

export type GraphEnhancedQuestionGeneratorInput = {
  factId: string;
  examId: string;
  subjectId: string;
  categoriesByConceptId: Record<string, string[]>;
  conceptsById: Record<string, Concept>;
  facts: AtomicFact[];
  template: QuestionTemplate;
  distractorRules: DistractorRule[];
  seed: string;
  productionGraph?: KnowledgeRelation[];
  scores?: ExamValueScore[];
};

export type GraphEnhancedQuestionGeneratorResult = {
  question: GeneratedQuestion | null;
  hint: QuestionGenerationHint | null;
};

export function generateGraphEnhancedQuestion(input: GraphEnhancedQuestionGeneratorInput): GraphEnhancedQuestionGeneratorResult {
  const fact = input.facts.find((item) => item.id === input.factId);
  if (!fact) return { question: null, hint: null };

  const productionGraph = (input.productionGraph ?? []).filter((relation) => relation.reviewStatus === "approved");
  const baseContext = buildQuestionGenerationContext(input.factId, input.facts, productionGraph, input.scores ?? []);
  const context = baseContext ? enhanceQuestionContext(baseContext, productionGraph, input.factId) : undefined;
  const hint = selectQuestionTypeHint(input.factId, productionGraph);

  return {
    hint,
    question: compileQuestion({
      examId: input.examId,
      subjectId: input.subjectId,
      categoriesByConceptId: input.categoriesByConceptId,
      conceptsById: input.conceptsById,
      facts: input.facts,
      fact,
      template: input.template,
      distractorRules: input.distractorRules,
      seed: input.seed,
      context
    })
  };
}
