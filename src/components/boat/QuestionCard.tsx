"use client";

import { CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import type { GeneratedQuestion } from "@/domain/exam-engine/types";
import { cn } from "@/lib/utils";

type QuestionCardProps = {
  question: GeneratedQuestion;
  selectedChoiceId: string | null;
  onSelect: (choiceId: string, correct: boolean) => void;
  questionNumber?: number;
  total?: number;
};

const choiceLabels = ["A", "B", "C", "D"];

export function QuestionCard({ question, selectedChoiceId, onSelect, questionNumber, total }: QuestionCardProps) {
  const answered = selectedChoiceId !== null;
  const selectedChoice = question.choices.find((choice) => choice.id === selectedChoiceId);
  const isCorrect = Boolean(selectedChoice?.isCorrect);

  function select(choiceId: string) {
    if (answered) return;

    const choice = question.choices.find((item) => item.id === choiceId);
    if (!choice) return;
    onSelect(choice.id, choice.isCorrect);
  }

  return (
    <section className="rounded-3xl border border-cyan-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-black text-cyan-700">{question.difficulty}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{question.trace.questionType}</span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">validated</span>
          </div>
        </div>
        {questionNumber && total ? (
          <span className="shrink-0 rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
            {questionNumber}/{total}
          </span>
        ) : null}
      </div>

      <div className="flex gap-3">
        <HelpCircle className="mt-1 shrink-0 text-cyan-600" size={22} />
        <h2 className="text-lg font-black leading-7 text-slate-950">{question.stem}</h2>
      </div>

      <div className="mt-5 space-y-2">
        {question.choices.map((choice, index) => {
          const correctOption = answered && choice.isCorrect;
          const wrongSelected = answered && selectedChoiceId === choice.id && !choice.isCorrect;

          return (
            <button
              key={choice.id}
              type="button"
              className={cn(
                "relative z-0 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-bold transition",
                !answered && "border-slate-200 bg-white hover:border-cyan-400 hover:bg-cyan-50",
                correctOption && "border-emerald-300 bg-emerald-50 text-emerald-800",
                wrongSelected && "border-rose-300 bg-rose-50 text-rose-800",
                answered && !correctOption && !wrongSelected && "border-slate-100 bg-slate-50 text-slate-500"
              )}
              onClick={() => select(choice.id)}
              disabled={answered}
              aria-pressed={selectedChoiceId === choice.id}
            >
              <span className="flex min-w-0 gap-2">
                <span className="shrink-0 font-black text-cyan-700">{choiceLabels[index]}</span>
                <span className="leading-6">{choice.text}</span>
              </span>
              {correctOption ? <CheckCircle2 className="shrink-0" size={18} /> : null}
              {wrongSelected ? <XCircle className="shrink-0" size={18} /> : null}
            </button>
          );
        })}
      </div>

      {answered ? (
        <div className="mt-5 rounded-2xl bg-cyan-50 p-4">
          <p className={cn("text-sm font-black", isCorrect ? "text-emerald-700" : "text-rose-700")}>{isCorrect ? "정답" : "오답"}</p>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-700">{question.explanation}</p>
          <p className="mt-3 text-xs font-bold leading-5 text-slate-500">
            샘플 엔진 검증용 문제입니다. 실제 법령 또는 공식 정답 데이터로 단정하지 않습니다.
          </p>
        </div>
      ) : null}
    </section>
  );
}
