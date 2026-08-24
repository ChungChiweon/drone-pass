"use client";

import { useState } from "react";
import { ArrowRight, Check, CheckCircle2, CircleAlert, FileSearch, Radar, X } from "lucide-react";
import type { GeneratedQuestion } from "@/domain/exam-engine/types";
import { cn } from "@/lib/utils";

type QuestionCardProps = {
  question: GeneratedQuestion;
  selectedChoiceId: string | null;
  onSelect: (choiceId: string, correct: boolean) => void;
  onNext?: () => void;
  questionNumber?: number;
  total?: number;
};

const choiceLabels = ["A", "B", "C", "D"];

export function QuestionCard({ question, selectedChoiceId, onSelect, onNext, questionNumber, total }: QuestionCardProps) {
  const [pendingChoiceId, setPendingChoiceId] = useState<string | null>(null);
  const answered = selectedChoiceId !== null;
  const selectedChoice = question.choices.find((choice) => choice.id === selectedChoiceId);
  const isCorrect = Boolean(selectedChoice?.isCorrect);
  const sourceReferences = question.sourceReferences.filter((source) => Boolean(source.locator));

  function submitAnswer() {
    if (answered || !pendingChoiceId) return;
    const choice = question.choices.find((item) => item.id === pendingChoiceId);
    if (choice) onSelect(choice.id, choice.isCorrect);
  }

  return (
    <section aria-labelledby={`question-${question.id}`} className="relative overflow-hidden border border-[#1b567f] bg-[linear-gradient(145deg,rgba(7,29,52,.98),rgba(3,17,34,.98))] shadow-[inset_0_1px_0_rgba(125,220,255,.06),0_28px_80px_rgba(0,6,19,.38)]">
      <span className="pointer-events-none absolute left-3 top-3 z-10 h-5 w-5 border-l border-t border-cyan-300/45" aria-hidden="true" />
      <span className="pointer-events-none absolute right-3 top-3 z-10 h-5 w-5 border-r border-t border-cyan-300/45" aria-hidden="true" />
      <div className="relative border-b border-[#174363] bg-[#061a30]/90 px-5 py-4 sm:px-7">
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(61,179,238,.14)_1px,transparent_1px),linear-gradient(90deg,rgba(61,179,238,.14)_1px,transparent_1px)] [background-size:26px_26px]" aria-hidden="true" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="border border-cyan-300/35 bg-cyan-300/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-200">{question.subjectId}</span>
            <span className="text-[9px] font-black uppercase tracking-[0.16em] text-[#6989a5]">{question.trace.questionType}</span>
          </div>
          {questionNumber && total ? <span className="flex items-center gap-2 text-[10px] font-black tracking-[.14em] text-[#66dfff]"><Radar size={14} aria-hidden="true" />QUESTION {String(questionNumber).padStart(2,"0")} / {String(total).padStart(2,"0")}</span> : null}
        </div>
      </div>

      <div className="relative p-5 sm:p-7 lg:p-8">
        <div className="pointer-events-none absolute right-[-80px] top-[-95px] h-64 w-64 rounded-full border border-cyan-300/10" aria-hidden="true"><div className="absolute inset-10 rounded-full border border-cyan-300/10" /><div className="absolute left-1/2 top-0 h-full w-px bg-cyan-300/[.07]" /></div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#7394ae]">{question.categoryIds.join(" · ") || "Question command"}</p>
          <span className="border border-[#285473] bg-[#0a2239] px-3 py-1 text-[9px] font-black tracking-[.1em] text-[#8caac1]">DIFFICULTY · {question.difficulty}</span>
        </div>
        <div className="relative mt-5 border-l-2 border-cyan-300/60 bg-[linear-gradient(90deg,rgba(29,120,183,.12),transparent_72%)] px-4 py-4 sm:px-5">
          <p className="mb-3 text-[8px] font-black tracking-[.2em] text-cyan-300/75">QUESTION COMMAND STAGE</p>
          <h2 id={`question-${question.id}`} className="break-words text-[18px] font-extrabold leading-[1.7] tracking-[-0.015em] text-[#f1f8ff] sm:text-[20px]">{question.stem}</h2>
        </div>

        <div role="radiogroup" aria-label="답안 선택" className="mt-7 space-y-3">
          {question.choices.map((choice, index) => {
            const pending = !answered && pendingChoiceId === choice.id;
            const correctOption = answered && choice.isCorrect;
            const wrongSelected = answered && selectedChoiceId === choice.id && !choice.isCorrect;
            return (
              <button
                key={choice.id}
                type="button"
                role="radio"
                aria-checked={pending || selectedChoiceId === choice.id}
                aria-label={`${choiceLabels[index]}번 선택지${correctOption ? ", 정답" : wrongSelected ? ", 선택한 오답" : ""}`}
                className={cn(
                  "group flex min-h-[64px] w-full items-start gap-3.5 border px-4 py-4 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/20 motion-reduce:transition-none sm:px-[18px]",
                  !answered && !pending && "border-[#204d70] bg-[#081e35] hover:border-[#42c9ff] hover:bg-[#0a2947]",
                  pending && "border-[#48d7ff] bg-[#0b3155] shadow-[inset_0_0_28px_rgba(41,167,233,.08),0_0_22px_rgba(35,187,255,.1)]",
                  correctOption && "border-emerald-400/65 bg-emerald-400/[.09] shadow-[inset_0_0_24px_rgba(52,211,153,.06)]",
                  wrongSelected && "border-red-400/65 bg-red-400/[.09] shadow-[inset_0_0_24px_rgba(248,113,113,.05)]",
                  answered && !correctOption && !wrongSelected && "border-[#173954] bg-[#06182b] opacity-50"
                )}
                onClick={() => !answered && setPendingChoiceId(choice.id)}
                disabled={answered}
              >
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center border border-[#2b597b] bg-[#0b2945] text-sm font-black text-[#b8d3e7]", pending && "border-cyan-300 bg-[#127bd5] text-white", correctOption && "border-emerald-300 bg-emerald-600 text-white", wrongSelected && "border-red-300 bg-red-600 text-white")}>{correctOption ? <Check size={17} aria-hidden="true" /> : wrongSelected ? <X size={17} aria-hidden="true" /> : choiceLabels[index]}</span>
                <span className="min-w-0 break-words pt-1 text-[15px] font-semibold leading-7 text-[#d9e7f2] sm:text-base">{choice.text}</span>
              </button>
            );
          })}
        </div>

        {!answered ? (
          <button type="button" onClick={submitAnswer} disabled={!pendingChoiceId} className="fixed bottom-3 left-3 right-3 z-40 mt-6 inline-flex min-h-14 w-auto items-center justify-center gap-3 border border-[#54ddff] bg-[linear-gradient(135deg,#1288ef,#075bc4)] px-5 py-3 text-sm font-black text-white shadow-[0_14px_34px_rgba(20,129,222,.28)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/25 disabled:cursor-not-allowed disabled:border-[#244861] disabled:bg-[#0b263e] disabled:text-[#66839a] disabled:shadow-none motion-reduce:transition-none sm:static sm:w-full">
            {pendingChoiceId ? <>답안 확정 <ArrowRight size={17} aria-hidden="true" /></> : "답안을 선택하세요"}
          </button>
        ) : (
          <div aria-live="polite" className={cn("mt-6 border border-l-2 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.03)] sm:p-6", isCorrect ? "border-emerald-400/35 border-l-emerald-400 bg-emerald-400/[.06]" : "border-amber-400/35 border-l-amber-400 bg-amber-400/[.06]")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {isCorrect ? <CheckCircle2 className="text-emerald-300" size={20} aria-hidden="true" /> : <CircleAlert className="text-amber-300" size={20} aria-hidden="true" />}
                <span className={cn("text-xs font-black tracking-[0.08em]", isCorrect ? "text-emerald-300" : "text-amber-300")}>{isCorrect ? "CORRECT · 정답입니다" : "ATTENTION REQUIRED · 다시 확인할 개념이 있습니다"}</span>
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.16em] text-[#718da5]">Post-flight debrief</span>
            </div>
            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="text-[9px] font-black uppercase tracking-[.16em] text-[#7c9ab2]">Debrief analysis</p>
              {question.explanation ? <p className="mt-3 break-words text-sm font-medium leading-7 text-[#c5d5e1]">{question.explanation}</p> : <p className="mt-3 text-sm font-medium text-[#7892a7]">이 문제에 연결된 해설이 없습니다.</p>}
            </div>
            {question.conceptIds.length > 0 ? <div className="mt-4 border border-[#245070] bg-[#071c31]/80 p-3"><p className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-300">Knowledge link</p><p className="mt-2 break-words text-xs font-bold text-[#c5d9e8]">CONCEPT: {question.conceptIds.join(" · ")}</p></div> : null}
            {sourceReferences.length > 0 ? (
              <details className="mt-4 border border-[#245070] bg-[#071c31]/80 p-3">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-[10px] font-black uppercase tracking-[.12em] text-[#72cfff]"><FileSearch size={15} aria-hidden="true" /> Source trace</summary>
                <ul className="mt-3 space-y-2 text-xs font-medium leading-5 text-[#8ca6bc]">{sourceReferences.map((source, index) => <li key={`${source.documentId}:${source.locator}:${index}`} className="break-words"><span className="font-bold text-[#c5d9e8]">{source.documentId}</span> · {source.locator}</li>)}</ul>
              </details>
            ) : <p className="mt-4 text-xs font-medium text-[#718da5]">이 문제에는 표시 가능한 Source trace가 없습니다.</p>}
            {onNext ? <button type="button" onClick={onNext} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 border border-cyan-300/45 bg-[#0a3156] px-5 py-3 text-sm font-black text-white transition hover:border-cyan-200 hover:bg-[#0d487b] hover:opacity-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/20 motion-reduce:transition-none">다음 문제로 계속 <ArrowRight size={17} aria-hidden="true" /></button> : null}
          </div>
        )}
      </div>
    </section>
  );
}
