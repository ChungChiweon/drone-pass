export type KnowledgeRelationCurationStatus =
  | "draft"
  | "review_candidate"
  | "approved_candidate"
  | "rejected_candidate";

export type KnowledgeRelationQualityScore = {
  relationId: string;
  confidenceScore: number;
  semanticValueScore: number;
  examRelevanceScore: number;
  redundancyScore: number;
  riskScore: number;
  overallScore: number;
  status: KnowledgeRelationCurationStatus;
};

export type RelationQualitySummary = {
  averageOverallScore: number;
  averageConfidenceScore: number;
  averageExamRelevanceScore: number;
  averageRiskScore: number;
};

export type RelationCurationResult = {
  totalRelations: number;
  reviewCandidates: KnowledgeRelationQualityScore[];
  approvedCandidates: KnowledgeRelationQualityScore[];
  rejectedCandidates: KnowledgeRelationQualityScore[];
  qualitySummary: RelationQualitySummary;
  scores: KnowledgeRelationQualityScore[];
};
