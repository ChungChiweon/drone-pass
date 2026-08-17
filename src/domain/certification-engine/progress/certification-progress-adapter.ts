import type { CertificationProgressContext, AdaptiveEngineProgressContext, TutorPipelineProgressContext } from "./certification-progress";

export function adaptProgressToAdaptiveContext(progress: CertificationProgressContext): AdaptiveEngineProgressContext {
  return {
    learnerStates: progress.learnerStates.map((state) => ({ ...state, wrongPatternTags: [...state.wrongPatternTags] })),
    learnerAnalytics: {
      ...progress.analytics,
      weakFacts: progress.analytics.weakFacts.map((item) => ({ ...item })),
      weakConcepts: progress.analytics.weakConcepts.map((item) => ({ ...item })),
      weakCategories: progress.analytics.weakCategories.map((item) => ({ ...item }))
    },
    adaptiveRecommendation: progress.adaptiveState.recommendations.map((item) => ({ ...item }))
  };
}

export function adaptProgressToTutorContext(progress: CertificationProgressContext): TutorPipelineProgressContext {
  return {
    weakFacts: [...progress.tutorState.weakFacts],
    learningHistory: [...progress.tutorState.learningHistory],
    recommendedReviewFacts: [...progress.tutorState.recommendedReviewFacts],
    analytics: {
      ...progress.analytics,
      weakFacts: progress.analytics.weakFacts.map((item) => ({ ...item })),
      weakConcepts: progress.analytics.weakConcepts.map((item) => ({ ...item })),
      weakCategories: progress.analytics.weakCategories.map((item) => ({ ...item }))
    }
  };
}
