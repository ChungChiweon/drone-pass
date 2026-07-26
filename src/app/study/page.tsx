"use client";

import { useEffect, useState } from "react";
import { ArrowRight, BookOpenCheck, FileWarning, RotateCcw, ShieldCheck } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";
import { QuestionCard } from "@/components/boat/QuestionCard";
import { getGeneratedQuestions } from "@/domain/exam-engine/delivery/question-delivery";
import type { GeneratedQuestion } from "@/domain/exam-engine/types";

export default function StudyPage() {
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const question = questions[index];

  useEffect(() => {
    setQuestions(getGeneratedQuestions({ seed: "study-demo", limit: 5 }));
  }, []);

  function handleSelect(choiceId: string, correct: boolean) {
    setSelectedChoiceId(choiceId);
    if (correct) {
      setCorrectCount((count) => count + 1);
    }
  }

  function nextQuestion() {
    setSelectedChoiceId(null);
    setIndex((current) => (current + 1) % questions.length);
  }

  function resetSet() {
    setSelectedChoiceId(null);
    setIndex(0);
    setCorrectCount(0);
  }

  return (
    <AppFrame>
      <div className="space-y-5">
        <section className="rounded-[2rem] border border-cyan-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex max-w-3xl flex-col gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
              <BookOpenCheck size={30} />
            </div>
            <div>
              <p className="text-sm font-black text-cyan-800">Fact + Template + Distractor + Compiler + Validator</p>
              <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">동적 문제 생성 엔진 샘플</h1>
              <p className="mt-3 text-sm font-semibold leading-7 text-slate-600 sm:text-base">
                기존 보트·해양 문제은행을 사용하지 않고, 샘플 팩트와 템플릿에서 생성한 검증 통과 문제만 표시합니다. 이 데이터는 엔진 구조 테스트용이며 공식 문제나 법령 정답 데이터가 아닙니다.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-cyan-50 p-4">
                <p className="text-xs font-black text-cyan-700">생성 문제</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{questions.length}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-xs font-black text-emerald-700">정답 수</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{correctCount}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="text-xs font-black text-amber-700">문제은행 상태</p>
                <p className="mt-2 text-lg font-black text-slate-950">샘플 엔진</p>
              </div>
            </div>
          </div>
        </section>

        {question ? (
          <>
            <QuestionCard question={question} selectedChoiceId={selectedChoiceId} onSelect={handleSelect} questionNumber={index + 1} total={questions.length} />
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-cyan-700 px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                onClick={nextQuestion}
                disabled={!selectedChoiceId}
              >
                다음 문제
                <ArrowRight size={18} />
              </button>
              <button
                type="button"
                className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-slate-700 ring-1 ring-cyan-100"
                onClick={resetSet}
              >
                <RotateCcw size={18} />
                다시 풀기
              </button>
            </div>
          </>
        ) : (
          <section className="rounded-3xl border border-amber-100 bg-amber-50 p-8 text-center shadow-sm">
            <FileWarning className="mx-auto text-amber-700" size={34} />
            <p className="mt-4 text-lg font-black text-amber-950">검증 통과 문제가 없습니다.</p>
          </section>
        )}

        <section className="rounded-[2rem] border border-amber-100 bg-amber-50 p-5 shadow-sm">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 shrink-0 text-amber-700" size={22} />
            <p className="text-sm font-semibold leading-6 text-amber-900">
              이 단계에서는 PDF 파싱, LLM 생성, 법제처 API, 관리자 검수, Supabase 신규 스키마를 구현하지 않았습니다. 문제 출력 시점에 LLM을 호출하지 않습니다.
            </p>
          </div>
        </section>
      </div>
    </AppFrame>
  );
}
