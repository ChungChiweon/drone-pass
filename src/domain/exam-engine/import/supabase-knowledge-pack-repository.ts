import type { SupabaseClient } from "@supabase/supabase-js";
import type { KnowledgePack } from "@/domain/exam-engine/types";
import {
  cacheKnowledgePack,
  createLocalKnowledgePackRepository
} from "./local-knowledge-pack-repository";
import type {
  ImportKnowledgePackInput,
  KnowledgePackRepository,
  KnowledgeReviewAuditEntry,
  KnowledgeReviewMetadata,
  KnowledgeReviewMetadataStore,
  RepositoryReadResult,
  StoredKnowledgePack,
  UpdateChecklistInput,
  UpdateReviewInput
} from "./knowledge-pack-repository";

type PackRow = {
  pack_id: string;
  payload: KnowledgePack;
  created_at: string;
  updated_at: string;
};

function toStored(row: PackRow): StoredKnowledgePack {
  return {
    id: row.pack_id,
    name: row.payload.domainPack.exams[0]?.title ?? "Knowledge Pack",
    importedAt: row.created_at,
    pack: row.payload
  };
}

function rpcError(error: { message: string } | null, fallback: string) {
  if (error) throw new Error(error.message);
  throw new Error(fallback);
}

export class SupabaseKnowledgePackRepository implements KnowledgePackRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async list() {
    const { data, error } = await this.supabase
      .from("knowledge_packs")
      .select("pack_id,payload,created_at,updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as PackRow[]).map(toStored);
  }

  async get(packId: string) {
    const { data, error } = await this.supabase
      .from("knowledge_packs")
      .select("pack_id,payload,created_at,updated_at")
      .eq("pack_id", packId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toStored(data as PackRow) : null;
  }

  async getActive() {
    const { data: active, error } = await this.supabase
      .from("knowledge_pack_active")
      .select("pack_id")
      .eq("singleton_key", "ACTIVE")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return active?.pack_id ? this.get(active.pack_id as string) : null;
  }

  async save(pack: KnowledgePack, name?: string) {
    const examId = pack.domainPack.exams[0]?.id ?? "knowledge-pack";
    const item: StoredKnowledgePack = {
      id: `${examId}:${Date.now().toString(36)}`,
      name: name ?? pack.domainPack.exams[0]?.title ?? "Knowledge Pack",
      importedAt: new Date().toISOString(),
      pack
    };
    return this.importAndActivate({ item, overwrite: false, approvalMode: "import" });
  }

  async update(id: string, pack: KnowledgePack) {
    const current = await this.get(id);
    if (!current) return null;
    return this.importAndActivate({
      item: { ...current, pack },
      overwrite: true,
      approvalMode: "import"
    });
  }

  async setActive(id: string) {
    const item = await this.get(id);
    if (!item) return null;
    const { error } = await this.supabase.from("knowledge_pack_active").upsert({
      singleton_key: "ACTIVE",
      pack_id: id
    });
    if (error) throw new Error(error.message);
    return item;
  }

  async importAndActivate(input: ImportKnowledgePackInput) {
    const { data, error } = await this.supabase.rpc("import_knowledge_pack_and_activate", {
      p_pack_id: input.item.id,
      p_schema_version: "1",
      p_payload: input.item.pack,
      p_review_metadata: input.metadata ?? {},
      p_audit: input.audit ?? [],
      p_overwrite: input.overwrite,
      p_approval_mode: input.approvalMode
    });
    if (error || !data) rpcError(error, "IMPORT_FAILED");
    return toStored(data as PackRow);
  }

  async updateReview(input: UpdateReviewInput) {
    const { data, error } = await this.supabase.rpc("update_atomic_fact_review", {
      p_pack_id: input.packId,
      p_fact_ids: input.factIds,
      p_action: input.action,
      p_next_status: input.nextStatus ?? null,
      p_approval_mode: input.approvalMode,
      p_memo: input.memo,
      p_metadata: input.metadata
    });
    if (error || !data) rpcError(error, "REVIEW_UPDATE_FAILED");
    return toStored(data as PackRow);
  }

  async updateChecklist(input: UpdateChecklistInput) {
    const { data, error } = await this.supabase.rpc("update_review_checklist", {
      p_pack_id: input.packId,
      p_fact_id: input.factId,
      p_metadata_patch: input.metadataPatch
    });
    if (error || !data) rpcError(error, "CHECKLIST_UPDATE_FAILED");
    return (data as { metadata: KnowledgeReviewMetadata }).metadata;
  }

  async getReviewMetadata(packId: string) {
    const { data, error } = await this.supabase
      .from("knowledge_review_metadata")
      .select("fact_id,metadata")
      .eq("pack_id", packId);
    if (error) throw new Error(error.message);
    return Object.fromEntries((data ?? []).map((row) => [row.fact_id, row.metadata])) as KnowledgeReviewMetadataStore;
  }

  async getAudit(packId: string) {
    const { data, error } = await this.supabase
      .from("knowledge_review_audit")
      .select("id,pack_id,fact_id,previous_status,next_status,action,approval_mode,reviewed_by,legacy_reviewed_by,memo,created_at")
      .eq("pack_id", packId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      id: row.id,
      packId: row.pack_id,
      factId: row.fact_id,
      previousStatus: row.previous_status,
      nextStatus: row.next_status,
      action: row.action,
      approvalMode: row.approval_mode,
      reviewedBy: row.reviewed_by ?? row.legacy_reviewed_by ?? null,
      memo: row.memo ?? "",
      timestamp: row.created_at
    })) as KnowledgeReviewAuditEntry[];
  }
}

export class CachedKnowledgePackRepository implements KnowledgePackRepository {
  private readonly cache = createLocalKnowledgePackRepository();
  private readOnlyCache = false;

  constructor(private readonly server: KnowledgePackRepository) {}

  isReadOnlyCache() {
    return this.readOnlyCache;
  }

  private assertWritable() {
    if (this.readOnlyCache) throw new Error("READ_ONLY_CACHE");
  }

  async loadActive(): Promise<RepositoryReadResult<StoredKnowledgePack | null>> {
    try {
      const value = await this.server.getActive();
      this.readOnlyCache = false;
      if (value) cacheKnowledgePack(value, true);
      return { value, source: "server", readOnly: false };
    } catch {
      const value = await this.cache.getActive();
      this.readOnlyCache = true;
      return { value, source: "cache", readOnly: true };
    }
  }

  async list() {
    try {
      const values = await this.server.list();
      values.forEach((item) => cacheKnowledgePack(item));
      this.readOnlyCache = false;
      return values;
    } catch {
      this.readOnlyCache = true;
      return this.cache.list();
    }
  }

  async get(packId: string) {
    try {
      const value = await this.server.get(packId);
      if (value) cacheKnowledgePack(value);
      this.readOnlyCache = false;
      return value;
    } catch {
      this.readOnlyCache = true;
      return this.cache.get(packId);
    }
  }

  async getActive() {
    return (await this.loadActive()).value;
  }

  async save(pack: KnowledgePack, name?: string) {
    this.assertWritable();
    const value = await this.server.save(pack, name);
    cacheKnowledgePack(value, true);
    return value;
  }

  async update(id: string, pack: KnowledgePack) {
    this.assertWritable();
    const value = await this.server.update(id, pack);
    if (value) cacheKnowledgePack(value, true);
    return value;
  }

  async setActive(id: string) {
    this.assertWritable();
    const value = await this.server.setActive(id);
    if (value) cacheKnowledgePack(value, true);
    return value;
  }

  async importAndActivate(input: ImportKnowledgePackInput) {
    this.assertWritable();
    const value = await this.server.importAndActivate(input);
    cacheKnowledgePack(value, true);
    return value;
  }

  async updateReview(input: UpdateReviewInput) {
    this.assertWritable();
    const value = await this.server.updateReview(input);
    cacheKnowledgePack(value, true);
    return value;
  }

  async updateChecklist(input: UpdateChecklistInput) {
    this.assertWritable();
    return this.server.updateChecklist(input);
  }

  async getReviewMetadata(packId: string) {
    return this.server.getReviewMetadata(packId);
  }

  async getAudit(packId: string) {
    return this.server.getAudit(packId);
  }
}
