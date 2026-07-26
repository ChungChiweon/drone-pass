"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileJson, GitMerge, Save, Upload } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";
import {
  analyzeIncrementalKnowledgePack,
  incrementalInputCounts,
  isIncrementalKnowledgePack,
  resolveIncrementalTargetPack
} from "@/domain/exam-engine/import/incremental-knowledge-pack";
import { SupabaseKnowledgePackRepository } from "@/domain/exam-engine/import/supabase-knowledge-pack-repository";
import type { KnowledgePackRepository, StoredKnowledgePack } from "@/domain/exam-engine/import/knowledge-pack-repository";
import { validateKnowledgePack, type KnowledgePackValidationResult } from "@/domain/exam-engine/import/knowledge-pack-validator";
import type { AtomicFact, KnowledgePack } from "@/domain/exam-engine/types";
import { checkAdminAccess } from "@/lib/supabase/admin-access";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";

function parseJson(text: string) {
  try {
    return { value: JSON.parse(text) as unknown, error: null };
  } catch (error) {
    return { value: null, error: error instanceof Error ? error.message : "Invalid JSON" };
  }
}

function fullPackSummary(pack: unknown) {
  if (!pack || typeof pack !== "object") return null;
  const value = pack as Partial<KnowledgePack>;
  return {
    exams: value.domainPack?.exams?.length ?? 0,
    subjects: value.domainPack?.subjects?.length ?? 0,
    categories: value.domainPack?.categories?.length ?? 0,
    concepts: value.concepts?.length ?? 0,
    facts: value.atomicFacts?.length ?? 0,
    templates: value.questionTemplates?.length ?? 0,
    rules: value.distractorRules?.length ?? 0
  };
}

function countIds(values: Record<string, string[]>) {
  return Object.values(values).reduce((total, list) => total + list.length, 0);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
      {children}
    </section>
  );
}

export default function AdminImportPage() {
  const router = useRouter();
  const [jsonText, setJsonText] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [replaceConflicts, setReplaceConflicts] = useState(false);
  const [confirmedTargetPackId, setConfirmedTargetPackId] = useState<string | null>(null);
  const [repository, setRepository] = useState<KnowledgePackRepository | null>(null);
  const [storedPacks, setStoredPacks] = useState<StoredKnowledgePack[]>([]);
  const [activePack, setActivePack] = useState<StoredKnowledgePack | null>(null);
  const [accessMessage, setAccessMessage] = useState("관리자 권한 확인 중");

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      if (!hasSupabaseEnv()) return setAccessMessage("Supabase 연결이 필요합니다.");
      const client = createClient();
      if (!client) return setAccessMessage("Supabase 연결이 필요합니다.");
      const access = await checkAdminAccess(client);
      if (cancelled) return;
      if (access.status === "unauthenticated") return router.replace("/login");
      if (access.status !== "authenticated") return setAccessMessage(access.status === "forbidden" ? "관리자만 접근할 수 있습니다." : access.message);
      const nextRepository = new SupabaseKnowledgePackRepository(client);
      const [packs, active] = await Promise.all([nextRepository.list(), nextRepository.getActive()]);
      if (cancelled) return;
      setRepository(nextRepository);
      setStoredPacks(packs);
      setActivePack(active);
      setAccessMessage("");
    }
    void initialize();
    return () => { cancelled = true; };
  }, [router]);
  const parsed = useMemo(() => parseJson(jsonText), [jsonText]);
  const incrementalInput = parsed.value && isIncrementalKnowledgePack(parsed.value) ? parsed.value : null;
  const isIncremental = Boolean(incrementalInput);

  const targetResolution = useMemo(() => {
    if (!incrementalInput) return null;
    return resolveIncrementalTargetPack(incrementalInput, activePack, storedPacks, confirmedTargetPackId === activePack?.id);
  }, [activePack, confirmedTargetPackId, incrementalInput, storedPacks]);

  const fullValidation: KnowledgePackValidationResult | null = useMemo(() => {
    if (!jsonText.trim() || parsed.error || isIncremental) return null;
    return validateKnowledgePack(parsed.value);
  }, [jsonText, parsed, isIncremental]);

  const incrementalAnalysis = useMemo(() => {
    if (!incrementalInput || !activePack || !targetResolution?.canAnalyze) return null;
    return analyzeIncrementalKnowledgePack(activePack.pack, incrementalInput, replaceConflicts);
  }, [activePack, incrementalInput, replaceConflicts, targetResolution]);

  const fullSummary = useMemo(() => fullPackSummary(parsed.value), [parsed.value]);
  const incrementalCounts = incrementalInput ? incrementalInputCounts(incrementalInput) : null;
  const facts: AtomicFact[] =
    parsed.value && typeof parsed.value === "object" && "atomicFacts" in parsed.value ? ((parsed.value as { atomicFacts?: AtomicFact[] }).atomicFacts ?? []) : [];

  const canSaveFull = Boolean(fullValidation?.valid && parsed.value && !isIncremental);
  const canSaveIncremental = Boolean(incrementalAnalysis?.summary.canSave && incrementalAnalysis.merged && activePack && targetResolution?.status === "resolved" && !targetResolution.requiresConfirmation);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setJsonText(await file.text());
    setSavedMessage("");
    setConfirmedTargetPackId(null);
  }

  function handleJsonChange(value: string) {
    setJsonText(value);
    setSavedMessage("");
    setConfirmedTargetPackId(null);
  }

  async function saveFullPack() {
    if (!canSaveFull || !repository) return;
    if (fullValidation?.warnings.length && !window.confirm("경고가 있습니다. 그래도 저장하고 활성 Pack으로 지정할까요?")) return;
    const item = await repository.save(parsed.value as KnowledgePack);
    setSavedMessage(`${item.name} 저장 및 활성화 완료`);
    setActivePack(item);
    setStoredPacks(await repository.list());
  }

  async function saveIncrementalPack() {
    if (!canSaveIncremental || !incrementalAnalysis?.merged || !activePack || !repository) return;
    const latestActivePack = await repository.getActive();
    const latestStoredPacks = await repository.list();
    const latestResolution = incrementalInput
      ? resolveIncrementalTargetPack(incrementalInput, latestActivePack, latestStoredPacks, confirmedTargetPackId === latestActivePack?.id)
      : null;
    if (!latestResolution || latestResolution.status !== "resolved" || latestResolution.requiresConfirmation || latestResolution.resolvedTargetPackId !== activePack.id) {
      setSavedMessage("병합 대상을 다시 확인한 뒤 Import를 실행해 주세요.");
      return;
    }
    if (incrementalAnalysis.summary.validation.warnings.length && !window.confirm("경고가 있습니다. 그래도 병합 저장할까요?")) return;
    const updated = await repository.update(latestResolution.resolvedTargetPackId, incrementalAnalysis.merged);
    setSavedMessage(`${updated?.name ?? activePack.name} 증분 병합 완료`);
    if (updated) setActivePack(updated);
    setStoredPacks(await repository.list());
  }

  return (
    <AppFrame>
      <div className="space-y-5">
        {accessMessage ? <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-black text-amber-900">{accessMessage}</section> : null}
        <section className="rounded-[2rem] border border-cyan-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex max-w-3xl flex-col gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
              <FileJson size={30} />
            </div>
            <div>
              <p className="text-sm font-black text-cyan-800">Knowledge Pack Import</p>
              <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">드론 지식 Pack 가져오기</h1>
              <p className="mt-3 text-sm font-semibold leading-7 text-slate-600 sm:text-base">
                전체 Knowledge Pack을 새로 저장하거나, 현재 활성 Pack에 증분 Knowledge Pack을 병합합니다.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm">
            <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white">
              <Upload size={18} />
              JSON 파일 업로드
              <input type="file" accept="application/json,.json" className="hidden" onChange={handleFile} />
            </label>
            <textarea
              className="mt-4 min-h-[420px] w-full rounded-2xl border border-sky-100 bg-slate-50 p-4 font-mono text-sm text-slate-800 outline-none focus:border-cyan-400"
              value={jsonText}
              onChange={(event) => handleJsonChange(event.target.value)}
              placeholder="{&#10;  &quot;targetPackId&quot;: &quot;**ACTIVE**&quot;,&#10;  &quot;mode&quot;: &quot;merge&quot;,&#10;  &quot;atomicFacts&quot;: []&#10;}"
            />
          </div>

          <aside className="space-y-4">
            <Section title="활성 Pack">
              {activePack ? (
                <div className="mt-3 space-y-2 text-sm font-semibold text-slate-600">
                  <p className="font-black text-slate-950">{activePack.pack.domainPack.exams[0]?.title ?? activePack.name}</p>
                  <p className="break-all font-mono text-xs">{activePack.id}</p>
                  <p>저장된 Pack 수: {storedPacks.length}</p>
                </div>
              ) : (
                <p className="mt-3 text-sm font-semibold text-amber-700">활성 Pack이 없습니다. 증분 병합 전 전체 Pack을 먼저 저장하세요.</p>
              )}
            </Section>

            <Section title="검증 결과">
              {parsed.error ? <p className="mt-3 text-sm font-bold text-rose-700">JSON 파싱 오류: {parsed.error}</p> : null}
              {!parsed.error && jsonText.trim() ? (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-black text-cyan-700">
                    {isIncremental ? <GitMerge size={20} /> : <FileJson size={20} />}
                    {isIncremental ? "증분 병합 JSON" : "전체 Import JSON"}
                  </div>
                  {fullValidation ? (
                    <p className={`text-sm font-black ${fullValidation.valid ? "text-emerald-700" : "text-rose-700"}`}>
                      전체 Import: 오류 {fullValidation.errors.length}개 · 경고 {fullValidation.warnings.length}개
                    </p>
                  ) : null}
                  {targetResolution ? <TargetResolutionPanel resolution={targetResolution} /> : null}
                  {targetResolution?.status === "resolved" && targetResolution.requiresConfirmation ? (
                    <button
                      type="button"
                      className="min-h-10 rounded-2xl bg-amber-600 px-4 text-sm font-black text-white"
                      onClick={() => setConfirmedTargetPackId(targetResolution.resolvedTargetPackId ?? null)}
                    >
                      현재 활성 Pack에 병합 확인
                    </button>
                  ) : null}
                  {incrementalAnalysis ? (
                    <p className={`text-sm font-black ${incrementalAnalysis.summary.canSave ? "text-emerald-700" : "text-rose-700"}`}>
                      증분 병합: 충돌 {countIds(incrementalAnalysis.summary.conflicts)}개 · 오류 {incrementalAnalysis.summary.validation.errors.length}개 · 경고 {incrementalAnalysis.summary.validation.warnings.length}개
                    </p>
                  ) : null}
                </div>
              ) : !parsed.error ? (
                <p className="mt-3 text-sm font-semibold text-slate-500">JSON을 입력하면 검증을 시작합니다.</p>
              ) : null}

              {isIncremental ? (
                <label className="mt-5 flex items-center gap-2 text-sm font-bold text-slate-700">
                  <input type="checkbox" checked={replaceConflicts} onChange={(event) => setReplaceConflicts(event.target.checked)} />
                  동일 ID·다른 내용 충돌을 replace로 교체
                </label>
              ) : null}

              <button
                type="button"
                onClick={isIncremental ? saveIncrementalPack : saveFullPack}
                disabled={isIncremental ? !canSaveIncremental : !canSaveFull}
                className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-700 px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Save size={18} />
                {isIncremental ? "병합 저장" : "저장하고 활성화"}
              </button>
              {savedMessage ? <p className="mt-3 text-sm font-black text-emerald-700">{savedMessage}</p> : null}
            </Section>

            {fullSummary && !isIncremental ? <SummaryGrid title="전체 Pack 요약" values={fullSummary} /> : null}
            {incrementalCounts ? <SummaryGrid title="증분 입력 수" values={incrementalCounts} /> : null}
            {incrementalAnalysis ? <SummaryGrid title="변경 후 총 데이터 수" values={incrementalAnalysis.summary.totalCounts} /> : null}
          </aside>
        </section>

        {incrementalAnalysis ? <IncrementalPreview summary={incrementalAnalysis.summary} /> : null}
        {fullValidation && [...fullValidation.errors, ...fullValidation.warnings].length > 0 ? <IssueList title="전체 Import 오류/경고" issues={[...fullValidation.errors, ...fullValidation.warnings]} /> : null}

        {facts.length > 0 ? (
          <Section title="AtomicFact 미리보기">
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {facts.slice(0, 12).map((fact) => (
                <details key={fact.id} className="rounded-2xl border border-sky-100 bg-slate-50 p-4">
                  <summary className="cursor-pointer text-sm font-black text-slate-950">{fact.id}</summary>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{fact.statement}</p>
                  <dl className="mt-3 grid gap-1 text-xs font-semibold text-slate-500">
                    <div>factType: {fact.factType ?? "SOURCE_FACT"}</div>
                    <div>appliesTo: {fact.appliesTo?.join(", ") || "-"}</div>
                    <div>groupId: {fact.groupId ?? "-"}</div>
                    <div>groupOperator: {fact.groupOperator ?? "-"}</div>
                    <div>standaloneQuestionAllowed: {String(fact.standaloneQuestionAllowed ?? true)}</div>
                    <div>derivedFrom: {fact.derivedFrom?.join(", ") || "-"}</div>
                    <div>exceptionGroupReference: {fact.exceptionGroupReference ?? "-"}</div>
                    <div>crossReferences: {fact.crossReferences?.join(", ") || "-"}</div>
                  </dl>
                </details>
              ))}
            </div>
          </Section>
        ) : null}
      </div>
    </AppFrame>
  );
}

function TargetResolutionPanel({ resolution }: { resolution: ReturnType<typeof resolveIncrementalTargetPack> }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 text-xs font-semibold text-slate-600">
      <p>입력 targetPackId: <span className="font-mono">{resolution.inputTargetPackId ?? "(생략)"}</span></p>
      <p>실제 병합 대상 Pack ID: <span className="font-mono">{resolution.resolvedTargetPackId ?? "-"}</span></p>
      <p>Pack title: {resolution.targetTitle ?? "-"}</p>
      <p>Exam title: {resolution.targetExamTitle ?? "-"}</p>
      <p>활성 Pack 별칭 사용 여부: {resolution.usedActiveAlias ? "예" : "아니오"}</p>
      <p>확인 필요 여부: {resolution.requiresConfirmation ? "예" : "아니오"}</p>
      <p className={resolution.canAnalyze ? "mt-2 font-black text-emerald-700" : "mt-2 font-black text-rose-700"}>{resolution.message}</p>
      {resolution.candidatePacks?.length ? (
        <div className="mt-3 space-y-1">
          {resolution.candidatePacks.map((pack) => (
            <p key={pack.id} className="font-mono">
              {pack.active ? "[active] " : ""}
              {pack.id} / {pack.title ?? "-"} / {pack.examTitle ?? "-"}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SummaryGrid({ title, values }: { title: string; values: Record<string, number> }) {
  return (
    <Section title={title}>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-bold text-slate-700">
        {Object.entries(values).map(([key, value]) => (
          <div key={key} className="rounded-2xl bg-slate-50 px-3 py-2">
            <span className="text-slate-400">{key}</span>
            <p className="text-lg font-black text-slate-950">{value}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function IdGroup({ title, values }: { title: string; values: Record<string, string[]> }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <h3 className="text-sm font-black text-slate-950">{title}</h3>
      <div className="mt-2 space-y-1 text-xs font-semibold text-slate-600">
        {Object.entries(values).map(([key, itemIds]) => (
          <p key={key}>
            <span className="font-black">{key}</span>: {itemIds.length ? itemIds.join(", ") : "-"}
          </p>
        ))}
      </div>
    </div>
  );
}

function IncrementalPreview({ summary }: { summary: ReturnType<typeof analyzeIncrementalKnowledgePack>["summary"] }) {
  return (
    <Section title="증분 병합 미리보기">
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <IdGroup title="신규 추가 항목" values={summary.added} />
        <IdGroup title="동일 ID·동일 내용" values={summary.identical} />
        <IdGroup title="동일 ID·다른 내용 충돌" values={summary.conflicts} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <h3 className="text-sm font-black text-slate-950">중복 statement</h3>
          <div className="mt-2 space-y-1 text-xs font-semibold text-slate-600">
            {summary.duplicateStatements.length ? summary.duplicateStatements.map((item) => <p key={item}>{item}</p>) : <p>-</p>}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <h3 className="text-sm font-black text-slate-950">기존/신규 crossReference</h3>
          <div className="mt-2 space-y-1 text-xs font-semibold text-slate-600">
            {summary.crossReferences.length ? summary.crossReferences.map((item) => <p key={`${item.from}:${item.to}`}>{item.direction}: {item.from} -&gt; {item.to}</p>) : <p>-</p>}
          </div>
        </div>
      </div>

      {summary.brokenReferences.length ? <IssueList title="끊어진 참조" issues={summary.brokenReferences} /> : null}
      {[...summary.validation.errors, ...summary.validation.warnings].length ? <IssueList title="병합 후 검증 오류/경고" issues={[...summary.validation.errors, ...summary.validation.warnings]} /> : null}
    </Section>
  );
}

function IssueList({ title, issues }: { title: string; issues: Array<{ severity: "error" | "warning"; code: string; path: string; message: string }> }) {
  return (
    <div className="mt-4 rounded-2xl border border-amber-100 bg-white p-4">
      <h3 className="text-sm font-black text-slate-950">{title}</h3>
      <div className="mt-3 max-h-80 space-y-2 overflow-auto">
        {issues.map((issue, index) => (
          <div key={`${issue.code}:${issue.path}:${index}`} className="rounded-2xl bg-slate-50 p-3 text-sm">
            <p className={`font-black ${issue.severity === "error" ? "text-rose-700" : "text-amber-700"}`}>
              {issue.severity.toUpperCase()} · {issue.code}
            </p>
            <p className="mt-1 font-mono text-xs text-slate-500">{issue.path}</p>
            <p className="mt-1 font-semibold text-slate-700">{issue.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
