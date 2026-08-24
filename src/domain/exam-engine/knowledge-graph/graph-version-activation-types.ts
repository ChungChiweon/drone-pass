import type { AtomicFact } from "@/domain/exam-engine/types/knowledge";
import type { KnowledgeRelation } from "@/domain/exam-engine/types/knowledge-graph";
import type { ApprovedGraphRelation, KnowledgeGraphSnapshot, KnowledgeGraphVersion, KnowledgeGraphVersionAudit } from "./graph-versioning";

export type GraphVersionActivationRepository = {
  getRelations(packId: string): Promise<KnowledgeRelation[]>;
  getActiveGraph(packId: string): Promise<KnowledgeGraphSnapshot | null>;
  getVersion(versionId: string): Promise<KnowledgeGraphVersion | null>;
  getVersions(packId: string): Promise<KnowledgeGraphVersion[]>;
  saveVersion(version: KnowledgeGraphVersion): Promise<KnowledgeGraphVersion>;
  saveApproval(approval: ApprovedGraphRelation): Promise<ApprovedGraphRelation>;
  saveVersionAudit(entry: KnowledgeGraphVersionAudit): Promise<KnowledgeGraphVersionAudit>;
};

export type GraphVersionActivationValidation = {
  ok: boolean;
  errors: string[];
  activeVersionId: string | null;
  activeRelationCount: number;
};

export type GraphVersionActivationInput = {
  packId: string;
  versionId: string;
  facts: AtomicFact[];
  reviewerId: string;
  reason: string;
  relationIds: string[];
  expectedContentHash: string;
  expectedApprovedFactCount: number;
  now?: () => string;
  generateAuditId?: () => string;
};

export type GraphVersionActivationResult = {
  version: KnowledgeGraphVersion;
  audit: KnowledgeGraphVersionAudit | null;
  noOp: boolean;
};

export type GraphVersionRollbackResult = {
  version: KnowledgeGraphVersion;
  audit: KnowledgeGraphVersionAudit | null;
  noOp: boolean;
};
