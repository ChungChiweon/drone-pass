import type { KnowledgePack } from "@/domain/exam-engine/types";
import type {
  ImportKnowledgePackInput,
  KnowledgePackRepository,
  KnowledgeReviewAuditEntry,
  KnowledgeReviewMetadata,
  KnowledgeReviewMetadataStore,
  StoredKnowledgePack,
  UpdateChecklistInput,
  UpdateReviewInput
} from "./knowledge-pack-repository";

export const KNOWLEDGE_PACK_CACHE_KEY = "drone-pass:exam-engine:knowledge-packs";
export const ACTIVE_PACK_CACHE_KEY = "drone-pass:exam-engine:knowledge-packs:active";
export const LEGACY_REVIEW_METADATA_KEY = "dronepass.knowledgeReviewMetadata";
export const LEGACY_REVIEW_AUDIT_KEY = "dronepass.knowledgeReviewAudit";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function createId(pack: KnowledgePack) {
  const examId = pack.domainPack.exams[0]?.id ?? "knowledge-pack";
  return `${examId}:${Date.now().toString(36)}`;
}

export function readLocalKnowledgePacks(): StoredKnowledgePack[] {
  if (!canUseStorage()) return [];
  const raw = window.localStorage.getItem(KNOWLEDGE_PACK_CACHE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function readLegacyReviewMetadata(): KnowledgeReviewMetadataStore {
  if (!canUseStorage()) return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LEGACY_REVIEW_METADATA_KEY) ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function normalizeLegacyAudit(input: unknown): KnowledgeReviewAuditEntry[] {
  if (!Array.isArray(input)) return [];
  return input.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const value = entry as Record<string, unknown>;
    if (typeof value.factId !== "string" || typeof value.action !== "string") return [];
    return [{
      id: typeof value.id === "string" ? value.id : undefined,
      packId: typeof value.packId === "string" ? value.packId : undefined,
      factId: value.factId,
      previousStatus: (value.previousStatus ?? "draft") as KnowledgeReviewAuditEntry["previousStatus"],
      nextStatus: (value.nextStatus ?? value.previousStatus ?? "draft") as KnowledgeReviewAuditEntry["nextStatus"],
      action: value.action as KnowledgeReviewAuditEntry["action"],
      approvalMode: (value.approvalMode ?? null) as KnowledgeReviewAuditEntry["approvalMode"],
      reviewedBy: typeof value.reviewedBy === "string" ? value.reviewedBy : null,
      memo: typeof value.memo === "string" ? value.memo : "",
      timestamp: typeof value.timestamp === "string" ? value.timestamp : new Date(0).toISOString()
    }];
  });
}

export function readLegacyReviewAudit(): KnowledgeReviewAuditEntry[] {
  if (!canUseStorage()) return [];
  try {
    return normalizeLegacyAudit(JSON.parse(window.localStorage.getItem(LEGACY_REVIEW_AUDIT_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

function writeAll(items: StoredKnowledgePack[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(KNOWLEDGE_PACK_CACHE_KEY, JSON.stringify(items));
}

function writeReviewMetadata(metadata: KnowledgeReviewMetadataStore) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(LEGACY_REVIEW_METADATA_KEY, JSON.stringify(metadata));
}

function writeReviewAudit(audit: KnowledgeReviewAuditEntry[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(LEGACY_REVIEW_AUDIT_KEY, JSON.stringify(audit));
}

function createAuditId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `KFAUD-${uuid}`;
  return `KFAUD-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function cacheKnowledgePack(item: StoredKnowledgePack, makeActive = false) {
  const items = readLocalKnowledgePacks();
  const index = items.findIndex((pack) => pack.id === item.id);
  const next = index < 0 ? [item, ...items] : items.map((pack) => pack.id === item.id ? item : pack);
  writeAll(next);
  if (makeActive && canUseStorage()) window.localStorage.setItem(ACTIVE_PACK_CACHE_KEY, item.id);
}

export function createLocalKnowledgePackRepository(): KnowledgePackRepository {
  return {
    async save(pack, name) {
      const item = { id: createId(pack), name: name ?? pack.domainPack.exams[0]?.title ?? "Knowledge Pack", importedAt: new Date().toISOString(), pack };
      cacheKnowledgePack(item, true);
      return item;
    },
    async update(id, pack) {
      const item = readLocalKnowledgePacks().find((stored) => stored.id === id);
      if (!item) return null;
      const updated = { ...item, name: pack.domainPack.exams[0]?.title ?? item.name, pack };
      cacheKnowledgePack(updated);
      return updated;
    },
    async list() {
      return readLocalKnowledgePacks();
    },
    async get(id) {
      return readLocalKnowledgePacks().find((item) => item.id === id) ?? null;
    },
    async getActive() {
      if (!canUseStorage()) return null;
      const activeId = window.localStorage.getItem(ACTIVE_PACK_CACHE_KEY);
      const items = readLocalKnowledgePacks();
      return items.find((item) => item.id === activeId) ?? items[0] ?? null;
    },
    async setActive(id) {
      const item = readLocalKnowledgePacks().find((pack) => pack.id === id) ?? null;
      if (item && canUseStorage()) window.localStorage.setItem(ACTIVE_PACK_CACHE_KEY, item.id);
      return item;
    },
    async importAndActivate(input: ImportKnowledgePackInput) {
      const existing = readLocalKnowledgePacks().some((pack) => pack.id === input.item.id);
      if (existing && !input.overwrite) throw new Error("PACK_EXISTS");
      cacheKnowledgePack(input.item, true);
      return input.item;
    },
    async updateReview(input: UpdateReviewInput) {
      const item = readLocalKnowledgePacks().find((pack) => pack.id === input.packId);
      if (!item) throw new Error("PACK_NOT_FOUND");
      const ids = new Set(input.factIds);
      const transitions = item.pack.atomicFacts.filter((fact) =>
        ids.has(fact.id) &&
        input.nextStatus !== undefined &&
        fact.status !== input.nextStatus
      );
      if (!transitions.length) return item;
      const timestamp = new Date().toISOString();
      const updated = {
        ...item,
        pack: {
          ...item.pack,
          atomicFacts: item.pack.atomicFacts.map((fact) =>
            transitions.some((transition) => transition.id === fact.id)
              ? { ...fact, status: input.nextStatus! }
              : fact
          )
        }
      };
      cacheKnowledgePack(updated, true);
      const currentMetadata = readLegacyReviewMetadata();
      const nextMetadata = { ...currentMetadata };
      for (const transition of transitions) {
        nextMetadata[transition.id] = {
          ...(currentMetadata[transition.id] ?? {
            reviewState: "unreviewed",
            reviewMemo: "",
            reviewedAt: null,
            reviewedBy: null
          }),
          ...(input.metadata[transition.id] ?? {}),
          reviewedBy: input.metadata[transition.id]?.reviewedBy ?? "local-admin"
        };
      }
      writeReviewMetadata(nextMetadata);
      writeReviewAudit([
        ...readLegacyReviewAudit(),
        ...transitions.map((transition) => ({
          id: createAuditId(),
          packId: input.packId,
          factId: transition.id,
          previousStatus: transition.status,
          nextStatus: input.nextStatus!,
          action: input.action,
          approvalMode: input.approvalMode,
          reviewedBy: input.metadata[transition.id]?.reviewedBy ?? "local-admin",
          memo: input.memo,
          timestamp
        }))
      ]);
      return updated;
    },
    async updateChecklist(input: UpdateChecklistInput) {
      const metadata = readLegacyReviewMetadata();
      const current = metadata[input.factId] ?? {
        reviewState: "unreviewed", reviewMemo: "", reviewedAt: null, reviewedBy: null
      };
      const next = { ...current, ...input.metadataPatch } as KnowledgeReviewMetadata;
      writeReviewMetadata({ ...metadata, [input.factId]: next });
      return next;
    },
    async getReviewMetadata() {
      return readLegacyReviewMetadata();
    },
    async getAudit() {
      return readLegacyReviewAudit();
    }
  };
}

export async function importLocalKnowledgePack(item: StoredKnowledgePack, overwrite = false) {
  return createLocalKnowledgePackRepository().importAndActivate({ item, overwrite, approvalMode: "import" });
}

export function getActiveLocalKnowledgePack() {
  if (!canUseStorage()) return null;
  const activeId = window.localStorage.getItem(ACTIVE_PACK_CACHE_KEY);
  const items = readLocalKnowledgePacks();
  return (items.find((item) => item.id === activeId) ?? items[0] ?? null)?.pack ?? null;
}
