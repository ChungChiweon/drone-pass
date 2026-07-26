import type {
  AtomicFact,
  Category,
  Concept,
  DistractorRule,
  KnowledgePack,
  QuestionTemplate,
  SourceDocument,
  SourceRevision
} from "@/domain/exam-engine/types";
import { validateKnowledgePack, type KnowledgePackValidationIssue, type KnowledgePackValidationResult } from "./knowledge-pack-validator";

export type IncrementalKnowledgePack = {
  targetPackId?: string;
  mode: "merge";
  categories: Category[];
  sourceDocuments: SourceDocument[];
  sourceRevisions: SourceRevision[];
  concepts: Concept[];
  atomicFacts: AtomicFact[];
  questionTemplates?: QuestionTemplate[];
  distractorRules?: DistractorRule[];
};

export type IncrementalTargetPack = {
  id: string;
  name: string;
  pack: KnowledgePack;
  active?: boolean;
};

export type IncrementalTargetResolution = {
  status: "resolved" | "selection-required" | "blocked";
  inputTargetPackId?: string;
  resolvedTargetPackId?: string;
  targetTitle?: string;
  targetExamTitle?: string;
  usedActiveAlias: boolean;
  requiresConfirmation: boolean;
  canAnalyze: boolean;
  candidatePacks?: Array<{ id: string; title?: string; examTitle?: string; active?: boolean }>;
  reason?: "no-active-pack" | "target-pack-not-found" | "target-pack-not-active" | "multiple-active-packs" | "invalid-target-pack";
  message: string;
};

type ResolveIncrementalImportTargetInput = {
  inputTargetPackId?: string;
  activePacks: IncrementalTargetPack[];
  allPacks: IncrementalTargetPack[];
  omittedTargetConfirmed?: boolean;
};

export type IncrementalMergeSummary = {
  added: Record<string, string[]>;
  identical: Record<string, string[]>;
  conflicts: Record<string, string[]>;
  brokenReferences: KnowledgePackValidationIssue[];
  duplicateStatements: string[];
  crossReferences: Array<{ from: string; to: string; direction: "new-to-existing" | "existing-to-new" }>;
  totalCounts: {
    categories: number;
    sourceDocuments: number;
    sourceRevisions: number;
    concepts: number;
    atomicFacts: number;
    questionTemplates: number;
    distractorRules: number;
  };
  validation: KnowledgePackValidationResult;
  canSave: boolean;
};

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function ids<T extends { id: string }>(items: T[]) {
  return items.map((item) => item.id);
}

function mergeCollection<T extends { id: string }>(existing: T[], incoming: T[] = [], replaceConflicts: boolean) {
  const byId = new Map(existing.map((item) => [item.id, item]));
  const added: string[] = [];
  const identical: string[] = [];
  const conflicts: string[] = [];

  for (const item of incoming) {
    const current = byId.get(item.id);
    if (!current) {
      byId.set(item.id, item);
      added.push(item.id);
      continue;
    }

    if (stableStringify(current) === stableStringify(item)) {
      identical.push(item.id);
      continue;
    }

    conflicts.push(item.id);
    if (replaceConflicts) byId.set(item.id, item);
  }

  return {
    items: Array.from(byId.values()),
    added,
    identical,
    conflicts
  };
}

function ensureIncremental(input: unknown): IncrementalKnowledgePack | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Partial<IncrementalKnowledgePack>;
  if (value.targetPackId !== undefined && typeof value.targetPackId !== "string") return null;
  if (value.mode !== "merge") return null;
  if (!Array.isArray(value.categories) || !Array.isArray(value.sourceDocuments) || !Array.isArray(value.sourceRevisions)) return null;
  if (!Array.isArray(value.concepts) || !Array.isArray(value.atomicFacts)) return null;
  return {
    targetPackId: value.targetPackId,
    mode: "merge",
    categories: value.categories,
    sourceDocuments: value.sourceDocuments,
    sourceRevisions: value.sourceRevisions,
    concepts: value.concepts,
    atomicFacts: value.atomicFacts,
    questionTemplates: value.questionTemplates,
    distractorRules: value.distractorRules
  };
}

function findDuplicateStatements(pack: KnowledgePack) {
  const byStatement = new Map<string, string[]>();
  for (const fact of pack.atomicFacts) {
    const normalized = fact.statement.trim();
    const list = byStatement.get(normalized) ?? [];
    list.push(fact.id);
    byStatement.set(normalized, list);
  }
  return Array.from(byStatement.values()).filter((factIds) => factIds.length > 1).map((factIds) => factIds.join(", "));
}

function findCrossReferences(existing: KnowledgePack, incoming: IncrementalKnowledgePack) {
  const existingIds = new Set(existing.atomicFacts.map((fact) => fact.id));
  const incomingIds = new Set(incoming.atomicFacts.map((fact) => fact.id));
  const refs: IncrementalMergeSummary["crossReferences"] = [];

  for (const fact of incoming.atomicFacts) {
    for (const target of fact.crossReferences ?? []) {
      if (existingIds.has(target)) refs.push({ from: fact.id, to: target, direction: "new-to-existing" });
    }
  }

  for (const fact of existing.atomicFacts) {
    for (const target of fact.crossReferences ?? []) {
      if (incomingIds.has(target)) refs.push({ from: fact.id, to: target, direction: "existing-to-new" });
    }
  }

  return refs;
}

function buildMergedPack(base: KnowledgePack, incoming: IncrementalKnowledgePack, replaceConflicts: boolean) {
  const categoryMerge = mergeCollection(base.domainPack.categories, incoming.categories, replaceConflicts);
  const sourceDocumentMerge = mergeCollection(base.sourceDocuments, incoming.sourceDocuments, replaceConflicts);
  const sourceRevisionMerge = mergeCollection(base.sourceRevisions, incoming.sourceRevisions, replaceConflicts);
  const conceptMerge = mergeCollection(base.concepts, incoming.concepts, replaceConflicts);
  const atomicFactMerge = mergeCollection(base.atomicFacts, incoming.atomicFacts, replaceConflicts);
  const templateMerge = mergeCollection(base.questionTemplates, incoming.questionTemplates ?? [], replaceConflicts);
  const distractorMerge = mergeCollection(base.distractorRules, incoming.distractorRules ?? [], replaceConflicts);

  const merged: KnowledgePack = {
    domainPack: {
      ...base.domainPack,
      categories: categoryMerge.items
    },
    sourceDocuments: sourceDocumentMerge.items,
    sourceRevisions: sourceRevisionMerge.items,
    concepts: conceptMerge.items,
    atomicFacts: atomicFactMerge.items,
    questionTemplates: templateMerge.items,
    distractorRules: distractorMerge.items
  };

  const added = {
    categories: categoryMerge.added,
    sourceDocuments: sourceDocumentMerge.added,
    sourceRevisions: sourceRevisionMerge.added,
    concepts: conceptMerge.added,
    atomicFacts: atomicFactMerge.added,
    questionTemplates: templateMerge.added,
    distractorRules: distractorMerge.added
  };

  const identical = {
    categories: categoryMerge.identical,
    sourceDocuments: sourceDocumentMerge.identical,
    sourceRevisions: sourceRevisionMerge.identical,
    concepts: conceptMerge.identical,
    atomicFacts: atomicFactMerge.identical,
    questionTemplates: templateMerge.identical,
    distractorRules: distractorMerge.identical
  };

  const conflicts = {
    categories: categoryMerge.conflicts,
    sourceDocuments: sourceDocumentMerge.conflicts,
    sourceRevisions: sourceRevisionMerge.conflicts,
    concepts: conceptMerge.conflicts,
    atomicFacts: atomicFactMerge.conflicts,
    questionTemplates: templateMerge.conflicts,
    distractorRules: distractorMerge.conflicts
  };

  return { merged, added, identical, conflicts };
}

function countConflicts(conflicts: Record<string, string[]>) {
  return Object.values(conflicts).reduce((total, list) => total + list.length, 0);
}

export function isIncrementalKnowledgePack(input: unknown): input is IncrementalKnowledgePack {
  return Boolean(ensureIncremental(input));
}

function describePack(pack: IncrementalTargetPack) {
  return {
    title: pack.name,
    examTitle: pack.pack.domainPack.exams[0]?.title
  };
}

export function resolveIncrementalImportTarget({
  inputTargetPackId,
  activePacks,
  allPacks,
  omittedTargetConfirmed = false
}: ResolveIncrementalImportTargetInput): IncrementalTargetResolution {
  const rawTarget = inputTargetPackId?.trim();

  if (activePacks.length > 1) {
    return {
      status: "selection-required",
      inputTargetPackId: rawTarget,
      usedActiveAlias: rawTarget === "**ACTIVE**",
      requiresConfirmation: false,
      canAnalyze: false,
      candidatePacks: activePacks.map((pack) => {
        const description = describePack(pack);
        return { id: pack.id, title: description.title, examTitle: description.examTitle, active: true };
      }),
      message: "활성 Knowledge Pack이 여러 개입니다. 병합할 Pack을 직접 선택해 주세요."
    };
  }

  const activePack = activePacks[0] ?? null;

  if (rawTarget === "**ACTIVE**") {
    if (!activePack) {
      return {
        status: "blocked",
        reason: "no-active-pack",
        inputTargetPackId: rawTarget,
        usedActiveAlias: true,
        requiresConfirmation: false,
        canAnalyze: false,
        message: "병합할 활성 Knowledge Pack이 없습니다. 먼저 전체 Import로 Pack을 생성하고 활성화해 주세요."
      };
    }
    const description = describePack(activePack);
    return {
      status: "resolved",
      inputTargetPackId: rawTarget,
      resolvedTargetPackId: activePack.id,
      targetTitle: description.title,
      targetExamTitle: description.examTitle,
      usedActiveAlias: true,
      requiresConfirmation: !omittedTargetConfirmed,
      canAnalyze: true,
      message: omittedTargetConfirmed ? "사용자가 현재 활성 Pack 병합을 확인했습니다." : "**ACTIVE** 별칭으로 현재 활성 Pack을 병합 대상으로 사용합니다."
    };
  }

  if (rawTarget) {
    const matched = allPacks.find((pack) => pack.id === rawTarget);
    if (!matched) {
      return {
        status: "blocked",
        reason: "target-pack-not-found",
        inputTargetPackId: rawTarget,
        usedActiveAlias: false,
        requiresConfirmation: false,
        canAnalyze: false,
        message: `입력한 targetPackId와 일치하는 활성 Knowledge Pack을 찾을 수 없습니다. 입력값: ${rawTarget}`
      };
    }
    if (!activePack || matched.id !== activePack.id) {
      return {
        status: "blocked",
        reason: "target-pack-not-active",
        inputTargetPackId: rawTarget,
        usedActiveAlias: false,
        requiresConfirmation: false,
        canAnalyze: false,
        message: "입력한 Knowledge Pack은 존재하지만 현재 활성 Pack이 아닙니다. 비활성 Pack에는 증분 병합할 수 없습니다."
      };
    }
    const description = describePack(matched);
    return {
      status: "resolved",
      inputTargetPackId: rawTarget,
      resolvedTargetPackId: matched.id,
      targetTitle: description.title,
      targetExamTitle: description.examTitle,
      usedActiveAlias: false,
      requiresConfirmation: !omittedTargetConfirmed,
      canAnalyze: true,
      message: omittedTargetConfirmed ? "사용자가 현재 활성 Pack 병합을 확인했습니다." : "targetPackId가 현재 활성 Pack ID와 일치합니다."
    };
  }

  if (!activePack) {
    return {
      status: "blocked",
      reason: "no-active-pack",
      usedActiveAlias: false,
      requiresConfirmation: false,
      canAnalyze: false,
      message: "병합할 활성 Knowledge Pack이 없습니다. 먼저 전체 Import로 Pack을 생성하고 활성화해 주세요."
    };
  }

  const description = describePack(activePack);
  return {
    status: "resolved",
    resolvedTargetPackId: activePack.id,
    targetTitle: description.title,
    targetExamTitle: description.examTitle,
    usedActiveAlias: false,
    requiresConfirmation: !omittedTargetConfirmed,
    canAnalyze: true,
    message: omittedTargetConfirmed ? "사용자가 현재 활성 Pack 병합을 확인했습니다." : "targetPackId가 생략되었습니다. 현재 활성 Pack에 병합하려면 먼저 확인하세요."
  };
}

export function resolveIncrementalTargetPack(
  input: IncrementalKnowledgePack,
  activePack: IncrementalTargetPack | null,
  storedPacks: IncrementalTargetPack[],
  omittedTargetConfirmed = false
): IncrementalTargetResolution {
  return resolveIncrementalImportTarget({
    inputTargetPackId: input.targetPackId,
    activePacks: activePack ? [activePack] : [],
    allPacks: storedPacks,
    omittedTargetConfirmed
  });
}

export function analyzeIncrementalKnowledgePack(base: KnowledgePack, input: unknown, replaceConflicts = false): { input: IncrementalKnowledgePack | null; merged: KnowledgePack | null; summary: IncrementalMergeSummary } {
  const incoming = ensureIncremental(input);

  if (!incoming) {
    const validation = {
      valid: false,
      errors: [{ severity: "error" as const, code: "INVALID_INCREMENTAL_PACK", path: "$", message: "Incremental Knowledge Pack structure is invalid." }],
      warnings: []
    };
    return {
      input: null,
      merged: null,
      summary: {
        added: {},
        identical: {},
        conflicts: {},
        brokenReferences: validation.errors,
        duplicateStatements: [],
        crossReferences: [],
        totalCounts: {
          categories: base.domainPack.categories.length,
          sourceDocuments: base.sourceDocuments.length,
          sourceRevisions: base.sourceRevisions.length,
          concepts: base.concepts.length,
          atomicFacts: base.atomicFacts.length,
          questionTemplates: base.questionTemplates.length,
          distractorRules: base.distractorRules.length
        },
        validation,
        canSave: false
      }
    };
  }

  const { merged, added, identical, conflicts } = buildMergedPack(base, incoming, replaceConflicts);
  const validation = validateKnowledgePack(merged);
  const duplicateStatements = findDuplicateStatements(merged);
  const brokenReferences = [...validation.errors, ...validation.warnings].filter((issue) => issue.code.includes("MISSING") || issue.code.includes("REFERENCE"));
  const hasConflicts = countConflicts(conflicts) > 0;

  return {
    input: incoming,
    merged,
    summary: {
      added,
      identical,
      conflicts,
      brokenReferences,
      duplicateStatements,
      crossReferences: findCrossReferences(base, incoming),
      totalCounts: {
        categories: merged.domainPack.categories.length,
        sourceDocuments: merged.sourceDocuments.length,
        sourceRevisions: merged.sourceRevisions.length,
        concepts: merged.concepts.length,
        atomicFacts: merged.atomicFacts.length,
        questionTemplates: merged.questionTemplates.length,
        distractorRules: merged.distractorRules.length
      },
      validation,
      canSave: validation.valid && (!hasConflicts || replaceConflicts)
    }
  };
}

export function mergeIncrementalKnowledgePack(base: KnowledgePack, input: IncrementalKnowledgePack, replaceConflicts = false) {
  return analyzeIncrementalKnowledgePack(base, input, replaceConflicts).merged;
}

export function incrementalInputCounts(input: IncrementalKnowledgePack) {
  return {
    categories: ids(input.categories).length,
    sourceDocuments: ids(input.sourceDocuments).length,
    sourceRevisions: ids(input.sourceRevisions).length,
    concepts: ids(input.concepts).length,
    atomicFacts: ids(input.atomicFacts).length,
    questionTemplates: ids(input.questionTemplates ?? []).length,
    distractorRules: ids(input.distractorRules ?? []).length
  };
}
