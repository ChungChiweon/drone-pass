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

export type GraphAwareQuestionGeneratorInput = {
  factId: string;
  examId: string;
  subjectId: string;
  categoriesByConceptId: Record<string, string[]>;
  conceptsById: Record<string, Concept>;
  facts: AtomicFact[];
  template: QuestionTemplate;
  distractorRules: DistractorRule[];
  seed: string;
  relations?: KnowledgeRelation[];
  scores?: ExamValueScore[];
  graphContextEnabled?: boolean;
};

export const GRAPH_CONTEXT_ENABLED = false;

export function isGraphContextEnabled() {
  return process.env.GRAPH_CONTEXT_ENABLED === "true" || process.env.NEXT_PUBLIC_GRAPH_CONTEXT_ENABLED === "true";
}

export function generateGraphAwareQuestion(input: GraphAwareQuestionGeneratorInput): GeneratedQuestion | null {
  const fact = input.facts.find((item) => item.id === input.factId);
  if (!fact) return null;
  const enabled = input.graphContextEnabled ?? isGraphContextEnabled() ?? GRAPH_CONTEXT_ENABLED;
  const context = enabled
    ? buildQuestionGenerationContext(input.factId, input.facts, input.relations ?? [], input.scores ?? [])
    : undefined;

  return compileQuestion({
    examId: input.examId,
    subjectId: input.subjectId,
    categoriesByConceptId: input.categoriesByConceptId,
    conceptsById: input.conceptsById,
    facts: input.facts,
    fact,
    template: input.template,
    distractorRules: input.distractorRules,
    seed: input.seed,
    context: context ?? undefined
  });
}
