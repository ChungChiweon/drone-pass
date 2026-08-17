export type QuestionQualityReviewStatus = "draft" | "reviewed" | "approved" | "rejected";

export type QuestionQualityScore = {
  questionId: string;
  factId: string;
  factAccuracyScore: number;
  distractorQualityScore: number;
  difficultyFitScore: number;
  duplicationRiskScore: number;
  legalConfidenceScore: number;
  graphUsageScore: number;
  overallScore: number;
  reviewStatus: QuestionQualityReviewStatus;
};

export type QuestionBenchmarkResult = {
  averageScore: number;
  highestScoreQuestions: QuestionQualityScore[];
  lowestScoreQuestions: QuestionQualityScore[];
  improvementNeeded: QuestionQualityScore[];
  scores: QuestionQualityScore[];
};
