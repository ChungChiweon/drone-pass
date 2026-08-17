import type { CertificationRuntimeContext } from "@/domain/certification-engine/runtime/certification-runtime";
import type { CertificationProgressContext, CertificationProgressScope } from "./certification-progress";
import { scopeKey, validateProgressIsolation } from "./progress-isolation-validator";

export class CertificationProgressManager {
  private readonly contexts = new Map<string, CertificationProgressContext>();

  createProgressContext(input: {
    userId: string;
    runtime: CertificationRuntimeContext;
    context?: Partial<CertificationProgressContext>;
  }) {
    const context: CertificationProgressContext = {
      userId: input.userId,
      domainId: input.runtime.domain.domainId,
      packId: input.runtime.packDescriptor.packId,
      runtimeId: runtimeIdFor(input.runtime),
      learnerStates: input.context?.learnerStates ?? [],
      analytics: input.context?.analytics ?? emptyAnalytics(input.userId),
      adaptiveState: input.context?.adaptiveState ?? { recommendations: [], lastCalculatedAt: null },
      tutorState: input.context?.tutorState ?? { weakFacts: [], learningHistory: [], recommendedReviewFacts: [] }
    };
    this.contexts.set(scopeKey(scopeFromContext(context)), cloneContext(context));
    return context;
  }

  getProgressContext(scope: CertificationProgressScope) {
    const context = this.contexts.get(scopeKey(scope));
    return context ? cloneContext(context) : null;
  }

  switchCertificationProgress(userId: string, runtime: CertificationRuntimeContext) {
    const scope: CertificationProgressScope = {
      userId,
      certificationId: runtime.domain.domainId,
      packId: runtime.packDescriptor.packId
    };
    return this.getProgressContext(scope) ?? this.createProgressContext({ userId, runtime });
  }

  clearProgressContext(scope: CertificationProgressScope) {
    return this.contexts.delete(scopeKey(scope));
  }

  saveProgressContext(runtime: CertificationRuntimeContext, context: CertificationProgressContext) {
    const validation = validateProgressIsolation({ expectedUserId: context.userId, runtime, progress: context });
    if (!validation.valid) throw new Error(`Progress isolation failed: ${validation.errors.join("; ")}`);
    this.contexts.set(scopeKey(scopeFromContext(context)), cloneContext(context));
    return context;
  }
}

function runtimeIdFor(runtime: CertificationRuntimeContext) {
  return `${runtime.domain.domainId}:${runtime.packDescriptor.packId}:${runtime.packVersion.version}`;
}

function scopeFromContext(context: CertificationProgressContext): CertificationProgressScope {
  return { userId: context.userId, certificationId: context.domainId, packId: context.packId };
}

function emptyAnalytics(userId: string) {
  return {
    learnerId: userId,
    totalAttempts: 0,
    totalCorrect: 0,
    totalWrong: 0,
    accuracyRate: 0,
    weakFacts: [],
    weakConcepts: [],
    weakCategories: [],
    studyStreak: 0,
    lastStudyAt: null,
    estimatedPassProbability: 0
  };
}

function cloneContext(context: CertificationProgressContext): CertificationProgressContext {
  return {
    ...context,
    learnerStates: context.learnerStates.map((state) => ({ ...state, wrongPatternTags: [...state.wrongPatternTags] })),
    analytics: {
      ...context.analytics,
      weakFacts: context.analytics.weakFacts.map((item) => ({ ...item })),
      weakConcepts: context.analytics.weakConcepts.map((item) => ({ ...item })),
      weakCategories: context.analytics.weakCategories.map((item) => ({ ...item }))
    },
    adaptiveState: {
      ...context.adaptiveState,
      recommendations: context.adaptiveState.recommendations.map((item) => ({ ...item }))
    },
    tutorState: {
      weakFacts: [...context.tutorState.weakFacts],
      learningHistory: [...context.tutorState.learningHistory],
      recommendedReviewFacts: [...context.tutorState.recommendedReviewFacts]
    }
  };
}
