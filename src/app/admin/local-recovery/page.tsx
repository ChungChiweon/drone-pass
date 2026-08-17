"use client";

import { useEffect, useState } from "react";
import { createLocalKnowledgePackRepository } from "@/domain/exam-engine/import/local-knowledge-pack-repository";
import { createLocalKnowledgeGraphPersistenceRepository } from "@/domain/exam-engine/knowledge-graph/local-knowledge-graph-repository";
import { createInactiveGraphVersionCandidate } from "@/domain/exam-engine/knowledge-graph/graph-version-candidate";

const PACK_ID = "kr-drone-license:mrm0omvd";
const TARGET_FACT_IDS = ["AF-223", "AF-224", "AF-277", "AF-278", "AF-297", "AF-298", "AF-311", "AF-312", "AF-319"];
const RELATION_IDS = [
  "KG-CONFUSED_WITH-AF-223-AF-277", "KG-CONFUSED_WITH-AF-224-AF-278",
  "KG-CONFUSED_WITH-AF-224-AF-298", "KG-CONFUSED_WITH-AF-224-AF-312",
  "KG-CONFUSED_WITH-AF-277-AF-297", "KG-CONFUSED_WITH-AF-278-AF-298",
  "KG-CONFUSED_WITH-AF-278-AF-319", "KG-CONFUSED_WITH-AF-297-AF-311",
  "KG-CONFUSED_WITH-AF-298-AF-312", "KG-CONFUSED_WITH-AF-298-AF-319",
  "KG-CONFUSED_WITH-AF-312-AF-319"
];
const MEMO = "2026-07-31 공식 법령 검수 PASS 결과 재적용. 이전 승인 상태가 origin/localStorage에 영속되지 않아 localhost:4450 ACTIVE Pack에 단건 복구.";

type RecoveryView = {
  origin: string; packId: string; facts: number; approved: number;
  targetStatuses: Record<string, string>; approvedRelations: number;
  heldRelations: number; auditCount: number; graphAuditCount: number;
  versions: Array<{ versionId: string; status: string; relationCount: number; contentHash?: string }>;
  activeVersionId: string | null; activeRelations: number;
};

async function saveArtifact(fileName: string, payload: unknown) {
  const response = await fetch("/api/admin/local-recovery-artifact", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ fileName, payload })
  });
  if (!response.ok) throw new Error((await response.json()).error ?? "Artifact save failed.");
  return response.json() as Promise<{ path: string }>;
}

export default function LocalRecoveryPage() {
  const [view, setView] = useState<RecoveryView | null>(null);
  const [message, setMessage] = useState("Read-only state check.");
  const [busy, setBusy] = useState(false);

  async function loadState() {
    const packRepository = createLocalKnowledgePackRepository();
    const graphRepository = createLocalKnowledgeGraphPersistenceRepository();
    const active = await packRepository.getActive();
    if (!active) throw new Error("ACTIVE Pack missing.");
    const [relations, graphAudit, versions, activeGraph, factAudit] = await Promise.all([
      graphRepository.getRelations(active.id), graphRepository.getReviewAudit(active.id),
      graphRepository.getVersions(active.id), graphRepository.getActiveGraph(active.id),
      packRepository.getAudit(active.id)
    ]);
    const next: RecoveryView = {
      origin: window.location.origin, packId: active.id, facts: active.pack.atomicFacts.length,
      approved: active.pack.atomicFacts.filter((fact) => fact.status === "approved").length,
      targetStatuses: Object.fromEntries(TARGET_FACT_IDS.map((id) => [id, active.pack.atomicFacts.find((fact) => fact.id === id)?.status ?? "missing"])),
      approvedRelations: relations.filter((relation) => relation.reviewStatus === "approved").length,
      heldRelations: relations.filter((relation) => relation.reviewStatus === "held").length,
      auditCount: factAudit.length, graphAuditCount: graphAudit.length,
      versions: versions.map(({ versionId, status, relationCount, contentHash }) => ({ versionId, status, relationCount, contentHash })),
      activeVersionId: activeGraph?.versionId ?? null, activeRelations: activeGraph?.relations.length ?? 0
    };
    setView(next);
    return { active, relations, next };
  }

  useEffect(() => { void loadState().catch((error) => setMessage(error instanceof Error ? error.message : "Load failed.")); }, []);

  async function recover() {
    if (window.location.origin !== "http://localhost:4450") return setMessage("Blocked: origin mismatch.");
    setBusy(true);
    try {
      const before = await loadState();
      const targetStatuses = Object.values(before.next.targetStatuses);
      const needsApprovalRecovery = before.next.approved === 17 && targetStatuses.every((status) => status === "draft");
      const alreadyRecovered = before.next.approved === 26 && targetStatuses.every((status) => status === "approved");
      if (before.next.packId !== PACK_ID || before.next.facts !== 433
        || before.next.approvedRelations !== 11 || before.next.activeVersionId || before.next.activeRelations !== 0
        || (!needsApprovalRecovery && !alreadyRecovered)) {
        throw new Error("Blocked: precondition mismatch.");
      }
      const selectedRelations = RELATION_IDS.map((id) => before.relations.find((relation) => relation.id === id));
      if (selectedRelations.some((relation) => !relation || relation.reviewStatus !== "approved")) {
        throw new Error("Blocked: approved relation set mismatch.");
      }
      await saveArtifact("fact-approval-recovery-before-20260731.json", before.next);
      const packRepository = createLocalKnowledgePackRepository();
      if (needsApprovalRecovery) {
        for (const factId of TARGET_FACT_IDS) {
          await packRepository.updateReview({
            packId: PACK_ID, factIds: [factId], action: "approve", nextStatus: "approved",
            approvalMode: "single", memo: MEMO,
            metadata: { [factId]: { reviewState: "reviewed", reviewMemo: MEMO, reviewedAt: new Date().toISOString(), reviewedBy: "local-admin" } }
          });
        }
      }
      const afterApproval = await packRepository.getActive();
      if (!afterApproval || afterApproval.pack.atomicFacts.filter((fact) => fact.status === "approved").length !== 26) {
        throw new Error("Blocked: approval persistence failed.");
      }
      const candidate = createInactiveGraphVersionCandidate({
        packId: PACK_ID, relations: before.relations, facts: afterApproval.pack.atomicFacts,
        relationIds: RELATION_IDS, createdAt: "2026-07-30T00:00:00.000Z", createdBy: "local-admin",
        versionNumber: 1, auditRawCount: before.next.graphAuditCount, auditEffectiveTransitionCount: 12
      });
      if (candidate.version.contentHash !== "fnv1a-3cac6cec") throw new Error("Blocked: candidate hash mismatch.");
      const graphRepository = createLocalKnowledgeGraphPersistenceRepository();
      await graphRepository.saveVersion({
        ...candidate.version,
        benchmarkSummary: {
          classicQuality: 0.67, graphAwareQuality: 0.74, graphUsageScore: 0.32,
          graphBackedDistractorCount: 27, unsafeDistractorCount: 0, uniquenessFailureCount: 0
        }
      });
      const savedCandidate = await graphRepository.getVersion(candidate.version.versionId);
      if (!savedCandidate || savedCandidate.status !== "draft"
        || savedCandidate.relationCount !== 11 || savedCandidate.contentHash !== "fnv1a-3cac6cec"
        || JSON.stringify(savedCandidate.relationIds) !== JSON.stringify(RELATION_IDS)) {
        throw new Error("Blocked: repository candidate reload mismatch.");
      }
      const factAudit = await packRepository.getAudit(PACK_ID);
      await saveArtifact("prod-active-export-20260731-26approved.json", {
        schema: "drone-pass.knowledge-pack-export", version: 1, pack: afterApproval
      });
      const finalState = await loadState();
      await saveArtifact("local-recovery-state-20260731.json", {
        ...finalState.next, candidate: savedCandidate,
        newRecoveryAudits: factAudit.filter((entry) => TARGET_FACT_IDS.includes(entry.factId) && entry.memo === MEMO)
      });
      setMessage("Recovery completed. Reload this page to verify persistence.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Recovery failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-6">
      <h1 className="text-2xl font-black">Local Fact Approval Recovery</h1>
      <p role="status" className="rounded-xl border bg-white p-3 font-mono text-sm">{message}</p>
      <pre className="overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-sky-100">{JSON.stringify(view, null, 2)}</pre>
      <button type="button" disabled={busy || !view} onClick={() => void recover()} className="h-11 rounded-xl bg-blue-800 px-5 font-black text-white disabled:opacity-40">
        {busy ? "Recovering..." : "Apply verified single approvals and save candidate"}
      </button>
    </main>
  );
}
