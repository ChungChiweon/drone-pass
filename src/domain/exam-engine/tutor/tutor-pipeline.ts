import type { LearnerAnalytics } from "@/domain/exam-engine/analytics/learner-analytics";
import type { LearnerKnowledgeState } from "@/domain/exam-engine/adaptive/learner-state";
import type { AtomicFact, GeneratedQuestion, KnowledgeRelation } from "@/domain/exam-engine/types";
import { buildQuestionGenerationContext } from "@/domain/exam-engine/generation/question-generation-context-builder";
import { diagnoseError } from "./error-diagnosis-engine";
import type { ErrorDiagnosis, TutorLearningContext } from "./error-diagnosis";
import { buildTutorLearningContext } from "./tutor-context-builder";
import type { ExplanationStrategy, TutorResponseTemplate } from "./tutor-response";
import { buildTutorResponseTemplate, selectExplanationStrategy } from "./tutor-response-template";

export type TutorPipelineAnswer = {
  selectedAnswer: string;
  correctAnswer: string;
};

export type TutorPipelineResult = {
  diagnosis: ErrorDiagnosis;
  context: TutorLearningContext;
  responseTemplate: TutorResponseTemplate;
  recommendedNextFacts: string[];
  strategy: ExplanationStrategy;
};

export type TutorResponseProvider = {
  buildResponse(context: TutorLearningContext, strategy: ExplanationStrategy): TutorResponseTemplate;
};

export function createTemplateTutorResponseProvider(): TutorResponseProvider {
  return {
    buildResponse(context, strategy) {
      return buildTutorResponseTemplate({
        learnerId: context.errorDiagnosis.learnerId,
        questionId: context.errorDiagnosis.questionId,
        errorDiagnosis: context.errorDiagnosis,
        explanationFacts: context.relatedFacts,
        relatedFacts: context.relatedFacts,
        recommendedReviewFacts: context.recommendedNextFacts,
        difficulty: "medium",
        tone: "exam-focused"
      }, strategy);
    }
  };
}

export function runTutorPipeline(
  question: GeneratedQuestion,
  answer: TutorPipelineAnswer,
  facts: AtomicFact[],
  relations: KnowledgeRelation[],
  learnerState: LearnerKnowledgeState,
  analytics: LearnerAnalytics,
  provider: TutorResponseProvider = createTemplateTutorResponseProvider()
): TutorPipelineResult {
  const context = buildQuestionGenerationContext(question.trace.factId, facts, relations, []);
  const diagnosis = diagnoseError(question, answer.selectedAnswer, answer.correctAnswer, context, learnerState);
  const tutorContext = buildTutorLearningContext(diagnosis, analytics, relations);
  const strategy = selectExplanationStrategy(diagnosis);
  const responseTemplate = provider.buildResponse(tutorContext, strategy);

  return {
    diagnosis,
    context: tutorContext,
    responseTemplate,
    recommendedNextFacts: tutorContext.recommendedNextFacts,
    strategy
  };
}
