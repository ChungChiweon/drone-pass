import type { AtomicFact, KnowledgePack } from "@/domain/exam-engine/types";

export type StoredKnowledgePack = {
  id: string;
  name: string;
  importedAt: string;
  pack: KnowledgePack;
};

export type ApprovalMode = "single" | "bulk" | "import" | "migration" | null;
export type ReviewAction = "approve" | "hold" | "revert" | "unhold";

export type KnowledgeReviewMetadata = {
  reviewState: "unreviewed" | "held" | "reviewed";
  reviewMemo: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  checklist?: Record<string, boolean>;
  officialChecklist?: Record<string, boolean>;
};

export type KnowledgeReviewMetadataStore = Record<string, KnowledgeReviewMetadata>;

export type KnowledgeReviewAuditEntry = {
  id?: string;
  packId?: string;
  factId: string;
  previousStatus: AtomicFact["status"];
  nextStatus: AtomicFact["status"];
  action: ReviewAction;
  approvalMode: ApprovalMode;
  reviewedBy: string | null;
  memo: string;
  timestamp: string;
};

export type ImportKnowledgePackInput = {
  item: StoredKnowledgePack;
  metadata?: KnowledgeReviewMetadataStore;
  audit?: KnowledgeReviewAuditEntry[];
  overwrite: boolean;
  approvalMode: "import" | "migration";
};

export type UpdateReviewInput = {
  packId: string;
  factIds: string[];
  action: ReviewAction;
  nextStatus?: AtomicFact["status"];
  approvalMode: "single" | "bulk";
  memo: string;
  metadata: KnowledgeReviewMetadataStore;
};

export type UpdateChecklistInput = {
  packId: string;
  factId: string;
  metadataPatch: Partial<KnowledgeReviewMetadata>;
};

export type RepositoryReadResult<T> = {
  value: T;
  source: "server" | "cache";
  readOnly: boolean;
};

export type KnowledgePackRepository = {
  list(): Promise<StoredKnowledgePack[]>;
  get(packId: string): Promise<StoredKnowledgePack | null>;
  getActive(): Promise<StoredKnowledgePack | null>;
  save(pack: KnowledgePack, name?: string): Promise<StoredKnowledgePack>;
  update(id: string, pack: KnowledgePack): Promise<StoredKnowledgePack | null>;
  setActive(id: string): Promise<StoredKnowledgePack | null>;
  importAndActivate(input: ImportKnowledgePackInput): Promise<StoredKnowledgePack>;
  updateReview(input: UpdateReviewInput): Promise<StoredKnowledgePack>;
  updateChecklist(input: UpdateChecklistInput): Promise<KnowledgeReviewMetadata>;
  getReviewMetadata(packId: string): Promise<KnowledgeReviewMetadataStore>;
  getAudit(packId: string): Promise<KnowledgeReviewAuditEntry[]>;
};
