export type WeaknessMetric = {
  id: string;
  wrongRate: number;
  attemptCount: number;
  masteryScore?: number;
  priorityScore: number;
};

export type LearnerAnalytics = {
  learnerId: string;
  totalAttempts: number;
  totalCorrect: number;
  totalWrong: number;
  accuracyRate: number;
  weakFacts: WeaknessMetric[];
  weakConcepts: WeaknessMetric[];
  weakCategories: WeaknessMetric[];
  studyStreak: number;
  lastStudyAt: string | null;
  estimatedPassProbability: number;
};

export type AdaptiveRecommendationContext = {
  weakFacts: string[];
  weakConcepts: string[];
  recommendedReviewFacts: string[];
};
