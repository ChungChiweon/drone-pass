import type { SourceReference } from "@/domain/exam-engine/types";

export type KnowledgeFactLifecycleStatus = "draft" | "review" | "active" | "deprecated" | "archived";

export type KnowledgeFactLifecycle = {
  factId: string;
  currentVersion: string;
  status: KnowledgeFactLifecycleStatus;
  createdAt: string;
  updatedAt: string;
};

export type FactVersion = {
  versionId: string;
  factId: string;
  statement: string;
  sourceReference: SourceReference;
  confidence: number;
  createdAt: string;
  changeReason: string;
};

export type FactImpactRiskLevel = "low" | "medium" | "high";

export type FactImpactReport = {
  factId: string;
  affectedRelations: string[];
  affectedQuestions: string[];
  affectedConcepts: string[];
  examScore: number;
  riskLevel: FactImpactRiskLevel;
};

export type FactChangePreview = {
  factId: string;
  previousStatement: string;
  nextStatement: string;
  nextVersion: FactVersion;
};

export type FactDeprecationRecord = {
  factId: string;
  reason: string;
  replacedByFactId?: string;
  createdAt: string;
};

export type FactChangeType = "UPDATE" | "DEPRECATE" | "REPLACE";

export type FactChangeEvent = {
  eventId: string;
  factId: string;
  previousVersion: string;
  nextVersion: string;
  changeType: FactChangeType;
  createdAt: string;
};
