"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Download, Eye, FileJson, Filter, PauseCircle, Save, Search, ShieldAlert, Upload, X } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";
import {
  createLocalKnowledgePackRepository,
  readLegacyReviewAudit,
  readLegacyReviewMetadata,
  readLocalKnowledgePacks
} from "@/domain/exam-engine/import/local-knowledge-pack-repository";
import {
  CachedKnowledgePackRepository,
  SupabaseKnowledgePackRepository
} from "@/domain/exam-engine/import/supabase-knowledge-pack-repository";
import type {
  KnowledgePackRepository,
  KnowledgeReviewAuditEntry,
  KnowledgeReviewMetadata,
  StoredKnowledgePack
} from "@/domain/exam-engine/import/knowledge-pack-repository";
import { validateKnowledgePack, type KnowledgePackValidationIssue } from "@/domain/exam-engine/import/knowledge-pack-validator";
import type { AtomicFact, Concept, KnowledgePack, SourceReference } from "@/domain/exam-engine/types";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { checkAdminAccess } from "@/lib/supabase/admin-access";

type ReviewState = "unreviewed" | "held" | "reviewed";
type StatusFilter = "all" | "draft" | "approved";
type PresetFilter = "all" | "exam-review-10" | "exam-review-2" | "official-review-1";

type ReviewChecklist = {
  statementVerified: boolean;
  valueUnitVerified: boolean;
  conditionExceptionVerified: boolean;
  sourceVerified: boolean;
  referencesVerified: boolean;
  questionEligibilityVerified: boolean;
};

type OfficialChecklist = {
  officialSourceVerified: boolean;
  currentWordingVerified: boolean;
  amendmentHistoryChecked: boolean;
  sourceAndReviewNoteChecked: boolean;
};

type ReviewMetadata = KnowledgeReviewMetadata & {
  reviewState: ReviewState;
  reviewMemo: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  checklist?: ReviewChecklist;
  officialChecklist?: OfficialChecklist;
};

type ReviewMetadataStore = Record<string, ReviewMetadata>;
type AuditEntry = KnowledgeReviewAuditEntry;

type ExportedKnowledgePackFile = {
  schema: "drone-pass.knowledge-pack-export";
  version: 1;
  pack: StoredKnowledgePack;
  reviewMetadata?: ReviewMetadataStore;
  audit?: AuditEntry[];
};

type ImportPreview = {
  packId: string;
  name: string;
  importedAt: string;
  categories: number;
  concepts: number;
  atomicFacts: number;
  approvedAtomicFacts: number;
  questionTemplates: number;
  distractorRules: number;
  sourceDocuments: number;
  sourceRevisions: number;
  validationErrors: number;
  validationWarnings: number;
};

type FactView = {
  fact: AtomicFact;
  concept: Concept | null;
  categoryLabels: string[];
  issues: KnowledgePackValidationIssue[];
  hasBlockingIssue: boolean;
  review: ReviewMetadata;
};

const EXAM_REVIEW_PRESET_IDS = ["AF-001", "AF-003", "AF-036", "AF-045", "AF-059", "AF-143", "AF-145", "AF-162", "AF-164", "AF-172"];
const EXAM_REVIEW_SECOND_PRESET_IDS = ["AF-011", "AF-042", "AF-127", "AF-151", "AF-177", "AF-232", "AF-297", "AF-165", "AF-216", "AF-250"];
const OFFICIAL_REVIEW_PRESET_IDS = ["AF-234", "AF-273", "AF-296", "AF-305", "AF-316", "AF-321", "AF-418", "AF-419", "AF-420", "AF-422"];

const emptyChecklist: ReviewChecklist = {
  statementVerified: false,
  valueUnitVerified: false,
  conditionExceptionVerified: false,
  sourceVerified: false,
  referencesVerified: false,
  questionEligibilityVerified: false
};

const emptyOfficialChecklist: OfficialChecklist = {
  officialSourceVerified: false,
  currentWordingVerified: false,
  amendmentHistoryChecked: false,
  sourceAndReviewNoteChecked: false
};

const emptyReview: ReviewMetadata = {
  reviewState: "unreviewed",
  reviewMemo: "",
  reviewedAt: null,
  reviewedBy: null,
  checklist: emptyChecklist,
  officialChecklist: emptyOfficialChecklist
};


function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function getReview(metadata: ReviewMetadataStore, factId: string): ReviewMetadata {
  const stored = metadata[factId] ?? emptyReview;
  return {
    ...stored,
    checklist: { ...emptyChecklist, ...(stored.checklist ?? {}) },
    officialChecklist: { ...emptyOfficialChecklist, ...(stored.officialChecklist ?? {}) }
  };
}

function parseStoredPackFile(input: unknown): ExportedKnowledgePackFile | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Partial<ExportedKnowledgePackFile> & { pack?: Partial<StoredKnowledgePack> };
  const stored = value.pack;
  if (value.schema !== "drone-pass.knowledge-pack-export" || value.version !== 1) return null;
  if (!stored || typeof stored !== "object") return null;
  if (typeof stored.id !== "string" || typeof stored.name !== "string" || typeof stored.importedAt !== "string") return null;
  if (!stored.pack || typeof stored.pack !== "object") return null;
  return {
    schema: "drone-pass.knowledge-pack-export",
    version: 1,
    pack: stored as StoredKnowledgePack,
    reviewMetadata: value.reviewMetadata,
    audit: value.audit
  };
}

function summarizePackItem(item: StoredKnowledgePack, validationErrors = 0, validationWarnings = 0): ImportPreview {
  return {
    packId: item.id,
    name: item.name,
    importedAt: item.importedAt,
    categories: item.pack.domainPack.categories.length,
    concepts: item.pack.concepts.length,
    atomicFacts: item.pack.atomicFacts.length,
    approvedAtomicFacts: item.pack.atomicFacts.filter((fact) => fact.status === "approved").length,
    questionTemplates: item.pack.questionTemplates.length,
    distractorRules: item.pack.distractorRules.length,
    sourceDocuments: item.pack.sourceDocuments.length,
    sourceRevisions: item.pack.sourceRevisions.length,
    validationErrors,
    validationWarnings
  };
}

function factNumber(id: string) {
  const match = id.match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

function displayValue(value: AtomicFact["value"]) {
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function sourceLabel(source: SourceReference) {
  const revision = source.revisionId ? ` / ${source.revisionId}` : "";
  const note = source.note ? ` / ${source.note}` : "";
  return `${source.documentId}${revision} / ${source.locator}${note}`;
}

function issueFactId(issue: KnowledgePackValidationIssue, pack: KnowledgePack) {
  const match = issue.path.match(/\$\.atomicFacts\[(\d+)\]/);
  if (!match) return null;
  return pack.atomicFacts[Number(match[1])]?.id ?? null;
}

function groupIssuesByFact(pack: KnowledgePack, issues: KnowledgePackValidationIssue[]) {
  const grouped = new Map<string, KnowledgePackValidationIssue[]>();
  for (const issue of issues) {
    const factId = issueFactId(issue, pack);
    if (!factId) continue;
    grouped.set(factId, [...(grouped.get(factId) ?? []), issue]);
  }
  return grouped;
}

function hasBrokenReferences(fact: AtomicFact, pack: KnowledgePack) {
  const conceptIds = new Set(pack.concepts.map((concept) => concept.id));
  const documentIds = new Set(pack.sourceDocuments.map((document) => document.id));
  const revisionIds = new Set(pack.sourceRevisions.map((revision) => revision.id));
  const factIds = new Set(pack.atomicFacts.map((item) => item.id));
  if (!conceptIds.has(fact.conceptId)) return true;
  if (fact.sourceReferences.some((source) => !documentIds.has(source.documentId) || (source.revisionId ? !revisionIds.has(source.revisionId) : false))) return true;
  if (fact.crossReferences?.some((id) => !factIds.has(id))) return true;
  if (fact.derivedFrom?.some((id) => !factIds.has(id))) return true;
  if (fact.appliesTo?.some((id) => !factIds.has(id))) return true;
  return false;
}

function hasInvalidCompositeGroup(fact: AtomicFact, pack: KnowledgePack) {
  if (fact.factType !== "COMPOSITE_FACT") return false;
  if (!fact.groupId || !fact.groupOperator) return true;
  return pack.atomicFacts.filter((item) => item.factType === "COMPOSITE_FACT" && item.groupId === fact.groupId).length < 2;
}

function isOfficialReviewTarget(factId: string) {
  return OFFICIAL_REVIEW_PRESET_IDS.includes(factId);
}

function isChecklistComplete(checklist?: ReviewChecklist) {
  return Object.values({ ...emptyChecklist, ...(checklist ?? {}) }).every(Boolean);
}

function isOfficialChecklistComplete(checklist?: OfficialChecklist) {
  return Object.values({ ...emptyOfficialChecklist, ...(checklist ?? {}) }).every(Boolean);
}

function canApproveFact(view: FactView, pack: KnowledgePack) {
  if (view.fact.status !== "draft") return false;
  if (view.issues.some((issue) => issue.severity === "error")) return false;
  if (hasBrokenReferences(view.fact, pack)) return false;
  if (hasInvalidCompositeGroup(view.fact, pack)) return false;
  if (!isChecklistComplete(view.review.checklist)) return false;
  if (isOfficialReviewTarget(view.fact.id) && !isOfficialChecklistComplete(view.review.officialChecklist)) return false;
  return true;
}

export default function KnowledgeReviewPage() {
  const router = useRouter();
  const [, refresh] = useState(0);
  const [activeItem, setActiveItem] = useState<StoredKnowledgePack | null>(null);
  const [isLoadingActivePack, setIsLoadingActivePack] = useState(true);
  const [accessState, setAccessState] = useState<"checking" | "ready" | "env-missing" | "forbidden" | "error">("checking");
  const [accessMessage, setAccessMessage] = useState("");
  const [isReadOnlyCache, setIsReadOnlyCache] = useState(false);
  const [migrationCandidate, setMigrationCandidate] = useState<StoredKnowledgePack | null>(null);
  const [metadata, setMetadata] = useState<ReviewMetadataStore>({});
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("draft");
  const [presetFilter, setPresetFilter] = useState<PresetFilter>("all");
  const [searchText, setSearchText] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeFactId, setActiveFactId] = useState<string | null>(null);
  const [holdMemo, setHoldMemo] = useState("");
  const [message, setMessage] = useState("");
  const [importJsonText, setImportJsonText] = useState("");
  const [importFileName, setImportFileName] = useState("");
  const [importReplaceExisting, setImportReplaceExisting] = useState(false);
  const [importIncludeMetadata, setImportIncludeMetadata] = useState(false);
  const [importIncludeAudit, setImportIncludeAudit] = useState(false);
  const [importCreateBackup, setImportCreateBackup] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const repositoryRef = useRef<KnowledgePackRepository | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      if (!hasSupabaseEnv()) {
        const repository = createLocalKnowledgePackRepository();
        repositoryRef.current = repository;
        const value = await repository.getActive();
        if (cancelled) return;
        setActiveItem(value);
        setMetadata(readLegacyReviewMetadata() as ReviewMetadataStore);
        setAudit(readLegacyReviewAudit());
        setIsReadOnlyCache(false);
        setAccessState("ready");
        setIsLoadingActivePack(false);
        return;
      }
      const supabase = createClient();
      if (!supabase) return;
      const access = await checkAdminAccess(supabase);
      if (cancelled) return;
      if (access.status === "unauthenticated") {
        router.replace("/login");
        return;
      }
      if (access.status === "forbidden") {
        setAccessState("forbidden");
        setIsLoadingActivePack(false);
        return;
      }
      if (access.status === "error") {
        setAccessState("error");
        setAccessMessage(access.message);
        setIsLoadingActivePack(false);
        return;
      }
      const repository = new CachedKnowledgePackRepository(new SupabaseKnowledgePackRepository(supabase));
      repositoryRef.current = repository;
      const loaded = await repository.loadActive();
      if (cancelled) return;
      setIsReadOnlyCache(loaded.readOnly);
      setActiveItem(loaded.value);
      if (loaded.value) {
        try {
          const [serverMetadata, serverAudit] = await Promise.all([
            repository.getReviewMetadata(loaded.value.id),
            repository.getAudit(loaded.value.id)
          ]);
          setMetadata(serverMetadata as ReviewMetadataStore);
          setAudit(serverAudit);
        } catch {
          setIsReadOnlyCache(true);
          setMetadata(readLegacyReviewMetadata() as ReviewMetadataStore);
          setAudit(readLegacyReviewAudit());
        }
      } else if (!loaded.readOnly) {
        const activeId = window.localStorage.getItem("drone-pass:exam-engine:knowledge-packs:active");
        const local = readLocalKnowledgePacks();
        setMigrationCandidate(local.find((item) => item.id === activeId) ?? local[0] ?? null);
      }
      setAccessState("ready");
      setIsLoadingActivePack(false);
    }
    void initialize();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const pack = activeItem?.pack ?? null;
  const validation = pack ? validateKnowledgePack(pack) : null;
  const issuesByFact = useMemo(() => (pack && validation ? groupIssuesByFact(pack, [...validation.errors, ...validation.warnings]) : new Map<string, KnowledgePackValidationIssue[]>()), [pack, validation]);

  const views = useMemo<FactView[]>(() => {
    if (!pack) return [];
    return pack.atomicFacts.map((fact) => {
      const concept = pack.concepts.find((item) => item.id === fact.conceptId) ?? null;
      const categoryLabels = (concept?.categoryIds ?? []).map((id) => pack.domainPack.categories.find((category) => category.id === id)?.title ?? id);
      const issues = issuesByFact.get(fact.id) ?? [];
      return {
        fact,
        concept,
        categoryLabels,
        issues,
        hasBlockingIssue: issues.some((issue) => issue.severity === "error") || hasBrokenReferences(fact, pack) || hasInvalidCompositeGroup(fact, pack),
        review: getReview(metadata, fact.id)
      };
    });
  }, [issuesByFact, metadata, pack]);

  const filteredViews = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    return views
      .filter((view) => {
        if (presetFilter === "exam-review-10" && !EXAM_REVIEW_PRESET_IDS.includes(view.fact.id)) return false;
        if (presetFilter === "exam-review-2" && !EXAM_REVIEW_SECOND_PRESET_IDS.includes(view.fact.id)) return false;
        if (presetFilter === "official-review-1" && !OFFICIAL_REVIEW_PRESET_IDS.includes(view.fact.id)) return false;
        if (statusFilter !== "all" && view.fact.status !== statusFilter) return false;
        if (!normalizedSearch) return true;
        return [view.fact.id, view.fact.statement, view.fact.subject, view.fact.predicate, view.concept?.title ?? "", view.categoryLabels.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .sort((a, b) => factNumber(a.fact.id) - factNumber(b.fact.id));
  }, [presetFilter, searchText, statusFilter, views]);

  const activeFact = views.find((view) => view.fact.id === activeFactId) ?? null;
  const activePackExport = activeItem ? { schema: "drone-pass.knowledge-pack-export" as const, version: 1 as const, pack: activeItem } : null;

  const parsedImport = useMemo(() => {
    if (!importJsonText.trim()) return { error: "", value: null as ExportedKnowledgePackFile | null, preview: null as ImportPreview | null };
    try {
      const wrapped = parseStoredPackFile(JSON.parse(importJsonText) as unknown);
      if (!wrapped) return { error: "File must be a saved knowledge pack export.", value: null, preview: null };
      const validationResult = validateKnowledgePack(wrapped.pack.pack);
      return {
        error: validationResult.errors.length ? "Imported pack has validation errors." : "",
        value: wrapped,
        preview: summarizePackItem(wrapped.pack, validationResult.errors.length, validationResult.warnings.length)
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Invalid JSON", value: null, preview: null };
    }
  }, [importJsonText]);

  const summary = {
    total: pack?.atomicFacts.length ?? 0,
    draft: pack?.atomicFacts.filter((fact) => fact.status === "draft").length ?? 0,
    approved: pack?.atomicFacts.filter((fact) => fact.status === "approved").length ?? 0,
    filtered: filteredViews.length,
    errors: validation?.errors.length ?? 0,
    warnings: validation?.warnings.length ?? 0
  };

  const selectedViews = selectedIds.map((id) => views.find((view) => view.fact.id === id)).filter((view): view is FactView => Boolean(view));
  const selectedBlockedViews = pack ? selectedViews.filter((view) => view.fact.status !== "approved" && !canApproveFact(view, pack)) : [];
  const selectedApprovedViews = selectedViews.filter((view) => view.fact.status === "approved");
  const canApproveSelection = selectedViews.length > 0 && selectedBlockedViews.length === 0 && selectedApprovedViews.length === 0;

  async function updateChecklist(factId: string, key: keyof ReviewChecklist, checked: boolean) {
    if (!activeItem || !repositoryRef.current || isReadOnlyCache) return setMessage("읽기 전용 캐시에서는 체크리스트를 저장할 수 없습니다.");
    const currentReview = getReview(metadata, factId);
    const nextReview = {
      ...currentReview,
      checklist: { ...emptyChecklist, ...(currentReview.checklist ?? {}), [key]: checked }
    };
    try {
      const saved = await repositoryRef.current.updateChecklist({
        packId: activeItem.id,
        factId,
        metadataPatch: { checklist: nextReview.checklist }
      });
      setMetadata((current) => ({ ...current, [factId]: { ...nextReview, ...saved } as ReviewMetadata }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "체크리스트 저장 실패");
    }
  }

  async function updateOfficialChecklist(factId: string, key: keyof OfficialChecklist, checked: boolean) {
    if (!activeItem || !repositoryRef.current || isReadOnlyCache) return setMessage("읽기 전용 캐시에서는 체크리스트를 저장할 수 없습니다.");
    const currentReview = getReview(metadata, factId);
    const nextReview = {
      ...currentReview,
      officialChecklist: { ...emptyOfficialChecklist, ...(currentReview.officialChecklist ?? {}), [key]: checked }
    };
    try {
      const saved = await repositoryRef.current.updateChecklist({
        packId: activeItem.id,
        factId,
        metadataPatch: { officialChecklist: nextReview.officialChecklist }
      });
      setMetadata((current) => ({ ...current, [factId]: { ...nextReview, ...saved } as ReviewMetadata }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "공식 체크리스트 저장 실패");
    }
  }

  async function approveViews(targetViews: FactView[], mode: "single" | "bulk") {
    if (!pack || !activeItem || !repositoryRef.current) return;
    if (isReadOnlyCache) return setMessage("읽기 전용 캐시에서는 승인할 수 없습니다.");
    const approvable = targetViews.filter((view) => canApproveFact(view, pack));
    const blocked = targetViews.filter((view) => view.fact.status !== "approved" && !canApproveFact(view, pack));
    const alreadyApproved = targetViews.filter((view) => view.fact.status === "approved");
    if (!targetViews.length) return setMessage("Select facts to approve.");
    if (blocked.length || alreadyApproved.length || approvable.length !== targetViews.length) {
      const reasons = [];
      if (blocked.length) reasons.push(`Not ready: ${blocked.map((view) => view.fact.id).join(", ")}`);
      if (alreadyApproved.length) reasons.push(`Already approved: ${alreadyApproved.map((view) => view.fact.id).join(", ")}`);
      return setMessage(reasons.join(" / "));
    }
    const title = mode === "single" ? "Approve one" : "Approve selected";
    if (!window.confirm(`${title}: ${approvable.length}\n${approvable.map((view) => view.fact.id).join(", ")}`)) return;
    const approvableIds = new Set(approvable.map((view) => view.fact.id));
    const timestamp = new Date().toISOString();
    const nextMetadata = { ...metadata };
    for (const view of approvable) {
      nextMetadata[view.fact.id] = { ...getReview(nextMetadata, view.fact.id), reviewState: "reviewed", reviewedAt: timestamp };
    }
    try {
      const updated = await repositoryRef.current.updateReview({
        packId: activeItem.id,
        factIds: approvable.map((view) => view.fact.id),
        action: "approve",
        nextStatus: "approved",
        approvalMode: mode,
        memo: "",
        metadata: Object.fromEntries(approvable.map((view) => [view.fact.id, nextMetadata[view.fact.id]]))
      });
      setActiveItem(updated);
      const [savedMetadata, savedAudit] = await Promise.all([
        repositoryRef.current.getReviewMetadata(activeItem.id),
        repositoryRef.current.getAudit(activeItem.id)
      ]);
      setMetadata(savedMetadata as ReviewMetadataStore);
      setAudit(savedAudit);
    } catch (error) {
      return setMessage(error instanceof Error ? error.message : "승인 실패");
    }
    setSelectedIds((current) => current.filter((id) => !approvableIds.has(id)));
    setMessage(`Approved ${approvable.length} fact(s).`);
    refresh((value) => value + 1);
  }

  async function holdSelected() {
    if (!selectedIds.length || !activeItem || !repositoryRef.current) return;
    if (isReadOnlyCache) return setMessage("읽기 전용 캐시에서는 보류할 수 없습니다.");
    const timestamp = new Date().toISOString();
    const nextMetadata = { ...metadata };
    const nextAudit: AuditEntry[] = [];
    for (const id of selectedIds) {
      const fact = pack?.atomicFacts.find((item) => item.id === id);
      if (!fact) continue;
      nextMetadata[id] = { ...getReview(nextMetadata, id), reviewState: "held", reviewMemo: holdMemo, reviewedAt: timestamp };
      nextAudit.push({ factId: id, previousStatus: fact.status, nextStatus: fact.status, action: "hold", approvalMode: selectedIds.length === 1 ? "single" : "bulk", reviewedBy: null, memo: holdMemo, timestamp });
    }
    try {
      await repositoryRef.current.updateReview({
        packId: activeItem.id,
        factIds: nextAudit.map((entry) => entry.factId),
        action: "hold",
        approvalMode: nextAudit.length === 1 ? "single" : "bulk",
        memo: holdMemo,
        metadata: Object.fromEntries(nextAudit.map((entry) => [entry.factId, nextMetadata[entry.factId]]))
      });
      setMetadata(await repositoryRef.current.getReviewMetadata(activeItem.id) as ReviewMetadataStore);
      setAudit(await repositoryRef.current.getAudit(activeItem.id));
    } catch (error) {
      return setMessage(error instanceof Error ? error.message : "보류 실패");
    }
    setHoldMemo("");
    setMessage(`Held ${nextAudit.length} fact(s).`);
  }

  async function unholdFact(id: string) {
    if (!activeItem || !repositoryRef.current || isReadOnlyCache) return setMessage("읽기 전용 캐시에서는 변경할 수 없습니다.");
    const fact = pack?.atomicFacts.find((item) => item.id === id);
    const timestamp = new Date().toISOString();
    const next = { ...getReview(metadata, id), reviewState: "unreviewed" as const, reviewedAt: timestamp };
    try {
      await repositoryRef.current.updateReview({
        packId: activeItem.id,
        factIds: [id],
        action: "unhold",
        approvalMode: "single",
        memo: "",
        metadata: { [id]: next }
      });
      setMetadata((current) => ({ ...current, [id]: next }));
      setAudit(await repositoryRef.current.getAudit(activeItem.id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `보류 해제 실패: ${fact?.id ?? id}`);
    }
  }

  function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    void file.text().then(setImportJsonText);
  }

  async function handleImportSave() {
    if (!parsedImport.value || !parsedImport.preview || parsedImport.error || !repositoryRef.current) return;
    if (isReadOnlyCache) return setMessage("읽기 전용 캐시에서는 import할 수 없습니다.");
    const current = (await repositoryRef.current.list()).find((item) => item.id === parsedImport.value?.pack.id) ?? null;
    if (current && !importReplaceExisting) return setMessage("A pack with the same ID already exists. Confirm overwrite to continue.");
    if (!window.confirm(`Import pack ${parsedImport.value.pack.id} with ${parsedImport.preview.atomicFacts} atomic facts and ${parsedImport.preview.approvedAtomicFacts} approved facts?`)) return;
    if (importCreateBackup && activeItem) downloadJson(`dronepass-backup-${slugify(activeItem.name)}-${slugify(activeItem.id)}.json`, activePackExport);
    let stored: StoredKnowledgePack;
    try {
      stored = await repositoryRef.current.importAndActivate({
        item: parsedImport.value.pack,
        metadata: importIncludeMetadata ? parsedImport.value.reviewMetadata : undefined,
        audit: importIncludeAudit ? parsedImport.value.audit : undefined,
        overwrite: importReplaceExisting,
        approvalMode: "import"
      });
    } catch (error) {
      return setMessage(error instanceof Error ? error.message : "Import failed before save.");
    }
    setActiveItem(stored);
    setMetadata(await repositoryRef.current.getReviewMetadata(stored.id) as ReviewMetadataStore);
    setAudit(await repositoryRef.current.getAudit(stored.id));
    setMessage(`Imported and activated ${stored.id}. Approved preserved: ${stored.pack.atomicFacts.filter((fact) => fact.status === "approved").length}`);
    refresh((value) => value + 1);
  }

  function handleExportActivePack(includeReview = false) {
    if (!activePackExport) return;
    const value = includeReview ? { ...activePackExport, reviewMetadata: metadata, audit } : activePackExport;
    const suffix = includeReview ? "-with-review" : "";
    downloadJson(`dronepass-active-pack-${slugify(activePackExport.pack.name)}-${slugify(activePackExport.pack.id)}${suffix}.json`, value);
  }

  async function migrateLocalCandidate() {
    if (!migrationCandidate || !repositoryRef.current) return;
    const localMetadata = readLegacyReviewMetadata() as ReviewMetadataStore;
    const localAudit = readLegacyReviewAudit();
    const approved = migrationCandidate.pack.atomicFacts.filter((fact) => fact.status === "approved").length;
    const preview = `Category ${migrationCandidate.pack.domainPack.categories.length} / Concept ${migrationCandidate.pack.concepts.length} / AtomicFact ${migrationCandidate.pack.atomicFacts.length} / approved ${approved} / metadata ${Object.keys(localMetadata).length} / audit ${localAudit.length}`;
    if (!window.confirm(`서버로 이전: ${migrationCandidate.id}\n${preview}`)) return;
    try {
      const stored = await repositoryRef.current.importAndActivate({
        item: migrationCandidate,
        metadata: localMetadata,
        audit: localAudit,
        overwrite: false,
        approvalMode: "migration"
      });
      setActiveItem(stored);
      setMetadata(await repositoryRef.current.getReviewMetadata(stored.id) as ReviewMetadataStore);
      setAudit(await repositoryRef.current.getAudit(stored.id));
      setMigrationCandidate(null);
      setMessage("서버로 이전했습니다. 기존 localStorage 원본은 삭제하지 않았습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "서버 이전 실패");
    }
  }

  if (accessState === "checking") {
    return (
      <AppFrame>
        <StatusScreen title="Accessing system configuration..." description="Supabase access check is loading." />
      </AppFrame>
    );
  }
  if (accessState === "env-missing") {
    return (
      <AppFrame>
        <StatusScreen
          title="Supabase environment missing"
          description="NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. localStorage fallback may be used instead."
        />
      </AppFrame>
    );
  }
  if (accessState === "forbidden") {
    return (
      <AppFrame>
        <StatusScreen
          title="Access denied"
          description="profiles.role must be admin to open Knowledge Review."
        />
      </AppFrame>
    );
  }
  if (accessState === "error") {
    return (
      <AppFrame>
        <StatusScreen title="Access check failed" description={accessMessage || "Supabase connection issue."} />
      </AppFrame>
    );
  }

  return (
    <AppFrame>
      <div className="space-y-5">
        {isReadOnlyCache ? (
          <section className="flex items-start gap-3 rounded-2xl border border-[#ffd9a8] bg-[#fff7ea] p-4 text-sm font-bold leading-6 text-[#8a4f00] shadow-none">
            <span aria-hidden className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--drone-warning)]" />
            서버에 연결할 수 없어 읽기 전용 캐시를 표시합니다. 승인, 보류, 체크리스트, import는 차단됩니다.
          </section>
        ) : null}
        {migrationCandidate ? (
          <section className="rounded-2xl border border-[#c9dcff] bg-[linear-gradient(180deg,#f2f7ff,#ffffff)] p-5">
            <h2 className="text-base font-black tracking-[-0.02em] text-[var(--drone-cobalt)]">로컬 Pack을 서버로 이전할 수 있습니다</h2>
            <p className="mt-2 font-mono text-xs font-semibold leading-6 text-[var(--drone-text-soft)]">
              {migrationCandidate.id} · Category {migrationCandidate.pack.domainPack.categories.length} · Concept {migrationCandidate.pack.concepts.length} · AtomicFact {migrationCandidate.pack.atomicFacts.length} · approved {migrationCandidate.pack.atomicFacts.filter((fact) => fact.status === "approved").length} · metadata {Object.keys(readLegacyReviewMetadata()).length} · audit {readLegacyReviewAudit().length}
            </p>
            <div className="mt-3">
              <ActionButton onClick={() => void migrateLocalCandidate()} icon={<Upload size={17} />} label="서버로 이전" />
            </div>
          </section>
        ) : null}
        <section className="relative overflow-hidden rounded-2xl border border-[#123a7a] bg-[linear-gradient(135deg,#0f2f64_0%,#123a7a_55%,#1d64d0_100%)] p-6 shadow-[0_18px_48px_rgba(8,43,122,0.28)] sm:p-7">
          <span aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(to_right,rgba(255,255,255,.4)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.4)_1px,transparent_1px)] [background-size:28px_28px]" />
          <div className="relative">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#8ec8ff]">Knowledge Pack Admin</p>
            <h1 className="mt-2 text-[28px] font-black leading-tight tracking-[0em] text-white sm:text-3xl">AtomicFact 검수/승인</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#c6ddff]">법률 데이터는 수정하지 않고 상태, 체크리스트, review metadata만 관리합니다.</p>
          </div>
        </section>

        <section data-layout className="grid gap-4 lg:grid-cols-2">
          <Section title="Knowledge Pack export">
            <div className="mt-4 flex flex-wrap gap-2">
              <ActionButton onClick={() => handleExportActivePack(false)} disabled={!activePackExport} icon={<Download size={17} />} label="Export active pack" />
              <ActionButton onClick={() => handleExportActivePack(true)} disabled={!activePackExport} icon={<FileJson size={17} />} label="Export with review metadata" secondary />
              <ActionButton onClick={() => downloadJson("dronepass-knowledge-review-metadata.json", metadata)} icon={<Download size={17} />} label="Export review metadata" secondary />
              <ActionButton onClick={() => downloadJson("dronepass-knowledge-review-audit.json", audit)} icon={<Download size={17} />} label="Export audit" secondary />
            </div>
          </Section>

          <Section title="Knowledge Pack import">
            <div className="mt-4 space-y-3">
              <label className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#9cc6ff] bg-[#f4f9ff] px-4 text-[13px] font-black text-[var(--drone-cobalt)] transition hover:border-[var(--drone-cyan)] hover:bg-[#eaf5ff]">
                <Upload size={17} />
                Choose JSON file
                <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />
              </label>
              <p className="break-all rounded-xl border border-[var(--drone-line)] bg-white p-3 font-mono text-[11px] font-semibold text-[var(--drone-text-soft)]">{importFileName || "No file selected"}</p>
              {parsedImport.preview ? <ImportPreviewCard preview={parsedImport.preview} /> : null}
              {parsedImport.error ? <p className="text-sm font-black text-rose-700">{parsedImport.error}</p> : null}
              <CheckLine checked={importCreateBackup} onChange={setImportCreateBackup} label="Download backup before import" />
              <CheckLine checked={importReplaceExisting} onChange={setImportReplaceExisting} label="Overwrite existing pack with the same Pack ID" />
              <CheckLine checked={importIncludeMetadata} onChange={setImportIncludeMetadata} disabled={!parsedImport.value?.reviewMetadata} label="Import review metadata when included" />
              <CheckLine checked={importIncludeAudit} onChange={setImportIncludeAudit} disabled={!parsedImport.value?.audit} label="Import audit when included" />
              <div className="flex flex-wrap gap-2">
                <ActionButton onClick={() => void handleImportSave()} disabled={!parsedImport.preview || !!parsedImport.error || isReadOnlyCache} icon={<Save size={17} />} label="Save and activate" />
                <ActionButton onClick={() => { setImportJsonText(""); setImportFileName(""); }} icon={<X size={17} />} label="Clear" secondary />
                <ActionButton onClick={() => fileInputRef.current?.click()} icon={<FileJson size={17} />} label="Browse again" secondary />
              </div>
            </div>
          </Section>
        </section>

        {isLoadingActivePack ? (
          <Section title="Loading active pack">
            <p className="mt-3 text-sm font-semibold text-slate-600">Checking this browser origin for an ACTIVE Pack.</p>
          </Section>
        ) : !pack ? (
          <Section title="ACTIVE Pack 없음">
            <p className="mt-3 text-sm font-semibold text-amber-700">Knowledge Pack을 import하고 활성화하세요.</p>
          </Section>
        ) : (
          <>
            <section data-layout className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <Metric label="AtomicFact" value={summary.total} />
              <Metric label="draft" value={summary.draft} />
              <Metric label="approved" value={summary.approved} />
              <Metric label="filtered" value={summary.filtered} />
              <Metric label="validation 오류" value={summary.errors} tone={summary.errors ? "bad" : "good"} />
              <Metric label="경고" value={summary.warnings} tone={summary.warnings ? "warn" : "good"} />
            </section>

            <Section title="필터">
              <div className="mt-4 grid gap-3 lg:grid-cols-[180px_220px_1fr]">
                <Select label="status" value={statusFilter} onChange={(value) => setStatusFilter(value as StatusFilter)} options={[["all", "전체"], ["draft", "draft"], ["approved", "approved"]]} />
                <Select label="preset" value={presetFilter} onChange={(value) => setPresetFilter(value as PresetFilter)} options={[
                  ["all", "전체"],
                  ["exam-review-10", "시험 검수 10개"],
                  ["exam-review-2", "시험 검수 2차"],
                  ["official-review-1", "공식 검증 1차"]
                ]} />
                <label className="mt-[18px] flex h-11 items-center gap-2 rounded-xl border border-[var(--drone-line)] bg-white px-3 text-sm font-semibold text-[var(--drone-text-soft)] focus-within:border-[var(--drone-cyan)] focus-within:shadow-[0_0_0_3px_rgba(44,197,255,0.24)]">
                  <Search size={17} className="shrink-0 text-[var(--drone-sky)]" />
                  <input value={searchText} onChange={(event) => setSearchText(event.target.value)} className="w-full bg-transparent outline-none" placeholder="ID, statement, subject, predicate" />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <QuickButton onClick={() => setPresetFilter("exam-review-10")} label="시험 검수 10개" />
                <QuickButton onClick={() => setPresetFilter("exam-review-2")} label="시험 검수 2차" />
                <QuickButton onClick={() => setPresetFilter("official-review-1")} label="공식 검증 1차" />
              </div>
            </Section>

            <Section title="일괄 처리">
              <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
                <ActionButton onClick={() => setSelectedIds(filteredViews.filter((view) => view.fact.status === "draft").map((view) => view.fact.id))} icon={<Filter size={17} />} label="보이는 draft 선택" dark />
                <ActionButton onClick={() => setSelectedIds([])} icon={<X size={17} />} label="선택 해제" secondary />
                <ActionButton onClick={() => approveViews(selectedViews, "bulk")} disabled={!canApproveSelection} icon={<ClipboardCheck size={17} />} label="선택 승인" />
                <input value={holdMemo} onChange={(event) => setHoldMemo(event.target.value)} className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--drone-line)] bg-white px-3 text-sm font-semibold text-[var(--drone-ink)] outline-none" placeholder="보류 메모" />
                <ActionButton onClick={holdSelected} disabled={!selectedIds.length} icon={<PauseCircle size={17} />} label="보류" warn />
              </div>
              <p className="mt-3 text-sm font-bold text-slate-500">선택 {selectedIds.length}개. 선택 없음, 미충족, 이미 approved 포함 시 선택 승인은 비활성화됩니다.</p>
              {selectedBlockedViews.length ? <p className="mt-2 rounded-xl border border-[#ffb6c8] bg-[#ffe9ee] px-3 py-2 font-mono text-xs font-bold leading-5 text-[#b80f3a]">Not ready: {selectedBlockedViews.map((view) => view.fact.id).join(", ")}</p> : null}
              {selectedApprovedViews.length ? <p className="mt-2 rounded-xl border border-[#ffd9a8] bg-[#fff4df] px-3 py-2 font-mono text-xs font-bold leading-5 text-[#8a4f00]">Already approved: {selectedApprovedViews.map((view) => view.fact.id).join(", ")}</p> : null}
              {message ? <p role="status" aria-live="polite" className="mt-2 rounded-xl border border-[#bcd9ff] bg-[#eef5ff] px-3 py-2 text-sm font-bold leading-5 text-[var(--drone-cobalt)]">{message}</p> : null}
            </Section>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
              <Section title="검수 목록">
                <div className="mt-4 space-y-3">
                  {filteredViews.map((view) => (
                    <FactRow
                      key={view.fact.id}
                      view={view}
                      checked={selectedIds.includes(view.fact.id)}
                      canApprove={canApproveFact(view, pack)}
                      isOfficialReviewTarget={isOfficialReviewTarget(view.fact.id)}
                      isActive={view.fact.id === activeFactId}
                      onCheck={() => setSelectedIds((current) => (current.includes(view.fact.id) ? current.filter((item) => item !== view.fact.id) : [...current, view.fact.id]))}
                      onOpen={() => setActiveFactId(view.fact.id)}
                      onApproveOne={() => approveViews([view], "single")}
                      onUnhold={() => unholdFact(view.fact.id)}
                      onChecklistChange={(key, checked) => updateChecklist(view.fact.id, key, checked)}
                      onOfficialChecklistChange={(key, checked) => updateOfficialChecklist(view.fact.id, key, checked)}
                    />
                  ))}
                </div>
              </Section>
              <aside data-layout className="space-y-5 xl:sticky xl:top-4 xl:self-start">
                <DetailPanel view={activeFact} allViews={views} onOpen={setActiveFactId} />
                <Section title="최근 승인/보류 이력">
                  <div className="mt-3 max-h-80 space-y-2 overflow-auto">
                    {audit.slice(0, 20).map((entry, index) => (
                      <div key={`${entry.timestamp}:${entry.factId}:${index}`} data-layout className="rounded-xl border-l-2 border-[var(--drone-sky)] bg-[#f7faff] p-3 font-mono text-[11px] font-semibold text-[var(--drone-text-soft)]">
                        <p className="text-[12px] font-black text-[var(--drone-cobalt)]">{entry.action} / {entry.factId}</p>
                        <p>{entry.previousStatus} to {entry.nextStatus}</p>
                        <p>{entry.timestamp}</p>
                      </div>
                    ))}
                    {!audit.length ? <p className="text-sm font-semibold text-slate-500">아직 이력이 없습니다.</p> : null}
                  </div>
                </Section>
              </aside>
            </div>
          </>
        )}
      </div>
    </AppFrame>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--drone-line)] bg-[var(--drone-card)] p-5 shadow-[var(--drone-shadow)]">
      <h2 className="flex items-center gap-2 border-b border-[#eef3ff] pb-3 text-[15px] font-black tracking-[-0.02em] text-[var(--drone-ink)]">
        <span aria-hidden className="h-4 w-1 rounded-full bg-[linear-gradient(180deg,var(--drone-cyan),var(--drone-sky))]" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "good" | "warn" | "bad" }) {
  const color = tone === "good" ? "text-[var(--drone-success)]" : tone === "warn" ? "text-[var(--drone-warning)]" : tone === "bad" ? "text-[var(--drone-danger)]" : "text-[var(--drone-ink)]";
  const rule = tone === "good" ? "bg-[var(--drone-success)]" : tone === "warn" ? "bg-[var(--drone-warning)]" : tone === "bad" ? "bg-[var(--drone-danger)]" : "bg-[var(--drone-sky)]";
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--drone-line)] bg-[var(--drone-card)] p-4 shadow-[var(--drone-shadow)]">
      <span aria-hidden className={`absolute inset-x-0 top-0 h-[3px] ${rule}`} />
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--drone-text-soft)]">{label}</p>
      <p className={`mt-2 font-mono text-[26px] font-black leading-none tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--drone-text-soft)]">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-[var(--drone-line)] bg-white px-3 text-[13px] font-bold text-[var(--drone-ink)] outline-none">
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

function ActionButton({ label, icon, onClick, disabled, secondary, dark, warn }: { label: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean; secondary?: boolean; dark?: boolean; warn?: boolean }) {
  const style = dark
    ? "border-transparent bg-[var(--drone-ink)] text-white shadow-[0_10px_24px_rgba(11,23,48,0.24)]"
    : warn
      ? "border-transparent bg-[linear-gradient(180deg,#ffb347,#f59322)] text-[#4a2a00] shadow-[0_10px_24px_rgba(245,147,34,0.28)]"
      : secondary
        ? "border-[var(--drone-line)] bg-white text-[var(--drone-cobalt)] shadow-[0_6px_16px_rgba(8,43,122,0.08)]"
        : "border-transparent bg-[linear-gradient(180deg,#1d64d0,#0f2f64)] text-white shadow-[0_10px_26px_rgba(15,47,100,0.28)]";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-4 text-[13px] font-black tracking-[-0.01em] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 ${style}`}
    >
      {icon}
      {label}
    </button>
  );
}

function QuickButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#c9e8ff] bg-[#eaf6ff] px-3.5 text-[13px] font-black text-[#0b4a8f] transition hover:-translate-y-[1px] hover:bg-[#dcefff]">{label}</button>;
}

function CheckLine({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  return <label className="flex min-h-9 items-center gap-2.5 rounded-lg px-1 text-[13px] font-semibold text-[var(--drone-ink)] has-[:disabled]:opacity-45"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} disabled={disabled} className="h-4 w-4 shrink-0 accent-[var(--drone-sky)]" />{label}</label>;
}

function ImportPreviewCard({ preview }: { preview: ImportPreview }) {
  return (
    <div data-layout className="grid gap-x-4 gap-y-1.5 rounded-xl border border-[#a8e9ca] bg-[#f2fdf8] px-4 py-3.5 font-mono text-[11px] font-semibold text-[#0b5c43] sm:grid-cols-2">
      <p>Pack ID: <span className="font-mono">{preview.packId}</span></p>
      <p>Name: {preview.name}</p>
      <p>Categories: {preview.categories}</p>
      <p>Concepts: {preview.concepts}</p>
      <p>AtomicFacts: {preview.atomicFacts}</p>
      <p>Approved facts: {preview.approvedAtomicFacts}</p>
      <p>Templates: {preview.questionTemplates}</p>
      <p>Distractor rules: {preview.distractorRules}</p>
      <p>Source docs: {preview.sourceDocuments}</p>
      <p>Source revisions: {preview.sourceRevisions}</p>
      <p>Validation errors: {preview.validationErrors}</p>
      <p>Validation warnings: {preview.validationWarnings}</p>
    </div>
  );
}

function FactRow({ view, checked, canApprove, isOfficialReviewTarget, isActive, onCheck, onOpen, onUnhold, onApproveOne, onChecklistChange, onOfficialChecklistChange }: {
  view: FactView;
  checked: boolean;
  canApprove: boolean;
  isOfficialReviewTarget: boolean;
  isActive: boolean;
  onCheck: () => void;
  onOpen: () => void;
  onUnhold: () => void;
  onApproveOne: () => void;
  onChecklistChange: (key: keyof ReviewChecklist, checked: boolean) => void;
  onOfficialChecklistChange: (key: keyof OfficialChecklist, checked: boolean) => void;
}) {
  const fact = view.fact;
  const checklist = { ...emptyChecklist, ...(view.review.checklist ?? {}) };
  const officialChecklist = { ...emptyOfficialChecklist, ...(view.review.officialChecklist ?? {}) };
  const rail = fact.status === "approved" ? "bg-[var(--drone-success)]" : view.review.reviewState === "held" ? "bg-[var(--drone-warning)]" : view.hasBlockingIssue ? "bg-[var(--drone-danger)]" : "bg-[var(--drone-sky)]";
  return (
    <article data-testid="fact-row" className={`relative overflow-hidden rounded-2xl border p-4 pl-5 transition ${isActive ? "border-[var(--drone-cyan)] bg-[#f2fbff] shadow-[0_0_0_2px_rgba(44,197,255,0.18)]" : "border-[var(--drone-line)] bg-white"}`}>
      <span aria-hidden className={`absolute inset-y-0 left-0 w-[4px] ${rail}`} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <input type="checkbox" checked={checked} onChange={onCheck} className="mt-1 h-5 w-5 shrink-0" aria-label={`${fact.id} 선택`} />
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-[#eef3ff] px-2 py-0.5 font-mono text-[13px] font-black tracking-tight text-[var(--drone-cobalt)]">{fact.id}</span>
            <Badge label={fact.status} tone={fact.status === "approved" ? "good" : "neutral"} />
            {isOfficialReviewTarget ? <Badge label="공식 검증" tone="good" /> : null}
            {view.review.reviewState === "held" ? <Badge label="held" tone="warn" /> : null}
            {view.hasBlockingIssue ? <Badge label="검증 차단" tone="bad" /> : view.issues.length ? <Badge label="경고" tone="warn" /> : null}
          </div>
          <p className="mt-2.5 text-[15px] font-bold leading-7 text-[var(--drone-ink)]">{fact.statement}</p>
          <dl className="mt-3 grid gap-x-4 gap-y-1 border-t border-[#eef3ff] pt-3 font-mono text-[11px] font-semibold text-[var(--drone-text-soft)] lg:grid-cols-2">
            <div>Category: {view.categoryLabels.join(", ") || "-"}</div>
            <div>Concept: {view.concept?.title ?? fact.conceptId}</div>
            <div>subject: {fact.subject}</div>
            <div>predicate: {fact.predicate}</div>
            <div>operator/value: {fact.operator ?? "-"} / {displayValue(fact.value)} {fact.unit ?? ""}</div>
            <div>confidence: {fact.confidence ?? "-"}</div>
            <div>source: {fact.sourceReferences.map((source) => source.locator).join(", ")}</div>
          </dl>
        </button>
        <div className="flex shrink-0 flex-row gap-2 lg:flex-col">
          <ActionButton onClick={onOpen} icon={<Eye size={15} />} label="상세" dark />
          <ActionButton onClick={onApproveOne} disabled={!canApprove} icon={<ClipboardCheck size={15} />} label="단건 승인" />
          {!canApprove ? <span className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-[#ffd9a8] bg-[#fff7ea] px-3 text-xs font-black text-[#8a4f00]"><ShieldAlert size={15} />승인 차단</span> : null}
          {view.review.reviewState === "held" ? <ActionButton onClick={onUnhold} icon={<X size={15} />} label="보류 해제" secondary /> : null}
        </div>
      </div>
      <ChecklistPanel checklist={checklist} officialChecklist={officialChecklist} showOfficial={isOfficialReviewTarget} onChecklistChange={onChecklistChange} onOfficialChecklistChange={onOfficialChecklistChange} />
    </article>
  );
}

function ChecklistPanel({ checklist, officialChecklist, showOfficial, onChecklistChange, onOfficialChecklistChange }: {
  checklist: ReviewChecklist;
  officialChecklist: OfficialChecklist;
  showOfficial: boolean;
  onChecklistChange: (key: keyof ReviewChecklist, checked: boolean) => void;
  onOfficialChecklistChange: (key: keyof OfficialChecklist, checked: boolean) => void;
}) {
  return (
    <>
      <div data-layout className="mt-4 rounded-xl border border-[#e3ecff] bg-[#f7faff] p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
           <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--drone-cobalt)]">일반 체크리스트</p>
          <Badge label={isChecklistComplete(checklist) ? "checklist complete" : "checklist required"} tone={isChecklistComplete(checklist) ? "good" : "warn"} />
        </div>
        <div className="mt-3 grid gap-2 text-xs font-bold text-slate-700 sm:grid-cols-2 lg:grid-cols-3">
          <ChecklistItem label="statement 검토 완료" checked={checklist.statementVerified} onChange={(checked) => onChecklistChange("statementVerified", checked)} />
          <ChecklistItem label="값/단위 검증" checked={checklist.valueUnitVerified} onChange={(checked) => onChecklistChange("valueUnitVerified", checked)} />
          <ChecklistItem label="예외/조건 검증" checked={checklist.conditionExceptionVerified} onChange={(checked) => onChecklistChange("conditionExceptionVerified", checked)} />
          <ChecklistItem label="sourceReference 확인" checked={checklist.sourceVerified} onChange={(checked) => onChecklistChange("sourceVerified", checked)} />
          <ChecklistItem label="crossReference 확인" checked={checklist.referencesVerified} onChange={(checked) => onChecklistChange("referencesVerified", checked)} />
          <ChecklistItem label="문항 적합성 확인" checked={checklist.questionEligibilityVerified} onChange={(checked) => onChecklistChange("questionEligibilityVerified", checked)} />
        </div>
      </div>
      {showOfficial ? (
        <div data-layout className="mt-3 rounded-xl border border-[#a8e9ca] bg-[#f2fdf8] p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#0f8f63]">공식 체크리스트</p>
            <Badge label={isOfficialChecklistComplete(officialChecklist) ? "official checklist complete" : "official checklist required"} tone={isOfficialChecklistComplete(officialChecklist) ? "good" : "warn"} />
          </div>
          <div className="mt-3 grid gap-2 text-xs font-bold text-slate-700 sm:grid-cols-2">
            <ChecklistItem label="공식 원문 확인" checked={officialChecklist.officialSourceVerified} onChange={(checked) => onOfficialChecklistChange("officialSourceVerified", checked)} />
            <ChecklistItem label="현행 문언 확인" checked={officialChecklist.currentWordingVerified} onChange={(checked) => onOfficialChecklistChange("currentWordingVerified", checked)} />
            <ChecklistItem label="개정 이력 확인" checked={officialChecklist.amendmentHistoryChecked} onChange={(checked) => onOfficialChecklistChange("amendmentHistoryChecked", checked)} />
            <ChecklistItem label="sourceReference·reviewNote 확인" checked={officialChecklist.sourceAndReviewNoteChecked} onChange={(checked) => onOfficialChecklistChange("sourceAndReviewNoteChecked", checked)} />
          </div>
        </div>
      ) : null}
    </>
  );
}

function ChecklistItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  const style = checked ? "border-[#a8e9ca] bg-[#eafaf3] text-[#0f8f63]" : "border-[var(--drone-line)] bg-white text-[var(--drone-ink)]";
  return <label className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 transition ${style}`}><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 shrink-0 accent-[var(--drone-success)]" /><span className="leading-tight">{label}</span></label>;
}

function Badge({ label, tone }: { label: string; tone: "neutral" | "good" | "warn" | "bad" }) {
  const style = tone === "good" ? "bg-[#e8fbf2] text-[#0f8f63] ring-[#a8e9ca]" : tone === "warn" ? "bg-[#fff4df] text-[#8a4f00] ring-[#ffd9a8]" : tone === "bad" ? "bg-[#ffe9ee] text-[#b80f3a] ring-[#ffb6c8]" : "bg-[#f0f6ff] text-[var(--drone-cobalt)] ring-[var(--drone-line)]";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-[0.08em] ring-1 ${style}`}>{label}</span>;
}

function DetailPanel({ view, allViews, onOpen }: { view: FactView | null; allViews: FactView[]; onOpen: (id: string) => void }) {
  if (!view) {
    return <Section title="상세 패널"><p className="mt-3 text-sm font-semibold text-slate-500">팩트를 선택하면 상세를 확인할 수 있어요.</p></Section>;
  }
  const fact = view.fact;
  const siblingFacts = allViews.filter((item) => item.fact.conceptId === fact.conceptId && item.fact.id !== fact.id).slice(0, 12);
  const linkedIds = Array.from(new Set([...(fact.crossReferences ?? []), ...(fact.derivedFrom ?? [])])).sort();
  return (
      <Section title="상세 패널">
      <div className="mt-3 space-y-4 text-sm">
        <div>
          <p className="inline-block rounded-md bg-[#eef3ff] px-2 py-0.5 font-mono text-[11px] font-black text-[var(--drone-cobalt)]">{fact.id}</p>
          <p className="mt-2.5 text-[15px] font-bold leading-7 text-[var(--drone-ink)]">{fact.statement}</p>
        </div>
        <InfoBlock title="조건·예외">
          <List values={[...fact.conditions.map((item) => `${item.id}: ${item.statement}`), ...fact.exceptions.map((item) => `${item.id}: ${item.statement}`)]} empty="조건/예외 없음" />
        </InfoBlock>
        <InfoBlock title="출처">
          <List values={fact.sourceReferences.map(sourceLabel)} empty="출처 없음" />
        </InfoBlock>
        <InfoBlock title="confidence / reviewNote">
          <p>confidence: {fact.confidence ?? "-"}</p>
          <p className="mt-2 whitespace-pre-wrap leading-6">{fact.reviewNote || "-"}</p>
        </InfoBlock>
        <InfoBlock title="연결된 팩트">
          <div className="flex flex-wrap gap-2">{linkedIds.length ? linkedIds.map((id) => <LinkButton key={id} id={id} onOpen={onOpen} />) : <span className="text-slate-500">-</span>}</div>
        </InfoBlock>
        <InfoBlock title="동일 Concept">
          <div className="flex flex-wrap gap-2">{siblingFacts.length ? siblingFacts.map((item) => <LinkButton key={item.fact.id} id={item.fact.id} onOpen={onOpen} />) : <span className="text-slate-500">-</span>}</div>
        </InfoBlock>
      </div>
    </Section>
  );
}

function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return <div data-layout className="rounded-xl border border-[var(--drone-line)] bg-[#fbfdff] p-3.5"><h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--drone-text-soft)]">{title}</h3><div className="mt-2 text-[13px] font-semibold leading-6 text-[var(--drone-ink)]">{children}</div></div>;
}

function List({ values, empty }: { values: string[]; empty: string }) {
  if (!values.length) return <p className="text-slate-500">{empty}</p>;
  return <ul className="space-y-1">{values.map((value) => <li key={value}>{value}</li>)}</ul>;
}

function LinkButton({ id, onOpen }: { id: string; onOpen: (id: string) => void }) {
  return <button type="button" onClick={() => onOpen(id)} className="rounded-full border border-[var(--drone-line)] bg-white px-3 py-1 font-mono text-[11px] font-black text-[var(--drone-cobalt)] transition hover:-translate-y-[1px] hover:border-[var(--drone-cyan)] hover:bg-[#eaf6ff]">{id}</button>;
}

function StatusScreen({ title, description }: { title: string; description: string }) {
  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-[var(--drone-line)] bg-[var(--drone-card)] p-8 shadow-[var(--drone-shadow)]">
      <span aria-hidden className="mb-4 block h-1 w-12 rounded-full bg-[linear-gradient(90deg,var(--drone-cyan),var(--drone-sky))]" />
      <h1 className="text-2xl font-black tracking-[-0.03em] text-[var(--drone-ink)]">{title}</h1>
      <p className="mt-3 text-sm font-semibold leading-7 text-[var(--drone-text-soft)]">{description}</p>
    </section>
  );
}

