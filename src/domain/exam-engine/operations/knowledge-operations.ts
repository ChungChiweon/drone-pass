export type KnowledgeHealthWarningLevel = "LOW" | "MEDIUM" | "HIGH";

export type KnowledgeHealthWarning = {
  level: KnowledgeHealthWarningLevel;
  code: string;
  message: string;
};

export type KnowledgeHealthSummary = {
  totalFacts: number;
  activeFacts: number;
  deprecatedFacts: number;
  draftFacts: number;
  totalRelations: number;
  approvedRelations: number;
  pendingRelations: number;
  activeGraphVersion: string | null;
  factReviewQueueCount: number;
  graphReviewQueueCount: number;
  promotionPendingCount: number;
  propagationPendingCount: number;
  rebuildCandidateCount: number;
  totalSources: number;
  sourceCoverageScore: number;
  graphConnectionScore: number;
  reviewBacklogCount: number;
  changeBacklogCount: number;
  warningLevel: KnowledgeHealthWarningLevel;
  warnings: KnowledgeHealthWarning[];
};

export type KnowledgeHealthQueues = {
  factReviewQueueCount?: number;
  graphReviewQueueCount?: number;
  promotionPendingCount?: number;
  propagationPendingCount?: number;
  rebuildCandidateCount?: number;
  activeGraphVersion?: string | null;
};
