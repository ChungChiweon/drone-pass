import type { LearnerKnowledgeState } from "@/domain/exam-engine/adaptive/learner-state";
import type { AdaptivePriorityScore } from "@/domain/exam-engine/adaptive/learner-state";
import type { LearnerAnalytics } from "@/domain/exam-engine/analytics/learner-analytics";

export type CertificationProgressScope = {
  userId: string;
  certificationId: string;
  packId: string;
};

export type CertificationProgressContext = {
  userId: string;
  domainId: string;
  packId: string;
  runtimeId: string;
  learnerStates: LearnerKnowledgeState[];
  analytics: LearnerAnalytics;
  adaptiveState: {
    recommendations: AdaptivePriorityScore[];
    lastCalculatedAt: string | null;
  };
  tutorState: {
    weakFacts: string[];
    learningHistory: string[];
    recommendedReviewFacts: string[];
  };
};

export type AdaptiveEngineProgressContext = {
  learnerStates: LearnerKnowledgeState[];
  learnerAnalytics: LearnerAnalytics;
  adaptiveRecommendation: AdaptivePriorityScore[];
};

export type TutorPipelineProgressContext = {
  weakFacts: string[];
  learningHistory: string[];
  recommendedReviewFacts: string[];
  analytics: LearnerAnalytics;
};
