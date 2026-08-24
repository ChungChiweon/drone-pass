"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft, BarChart3, BookOpenCheck, ClipboardCheck,
  CloudSun, FileWarning, GraduationCap, Home, Plane, Radar, RotateCcw,
  Scale, ShieldCheck,
} from "lucide-react";
import { QuestionCard } from "@/components/boat/QuestionCard";
import { getGeneratedQuestions } from "@/domain/exam-engine/delivery/question-delivery";
import type { GeneratedQuestion } from "@/domain/exam-engine/types";

const trainingNav = [
  { href: "/", label: "홈", english: "COMMAND", icon: Home },
  { href: "/study", label: "문제 학습", english: "TRAINING", icon: GraduationCap },
  { href: "/theory", label: "이론 학습", english: "THEORY", icon: BookOpenCheck },
  { href: "/fishing-safety", label: "비행 안전", english: "SAFETY", icon: ShieldCheck },
  { href: "/sea-info", label: "항공 정보", english: "FLIGHT INFO", icon: CloudSun },
  { href: "/progress", label: "학습 현황", english: "PROGRESS", icon: BarChart3 },
  { href: "/dictionary", label: "드론 용어", english: "DICTIONARY", icon: ClipboardCheck },
];

function TechnicalLabel({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "cyan" | "amber" }) {
  const color = tone === "cyan" ? "text-[#65dcff]" : tone === "amber" ? "text-[#f1b84b]" : "text-[#7894b2]";
  return <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${color}`}>{children}</p>;
}

function TrainingRail() {
  return <aside className="fixed inset-y-0 left-0 z-50 hidden w-[232px] flex-col border-r border-[#143d60] bg-[linear-gradient(180deg,#071b33,#041326_72%,#061a31)] xl:flex">
    <Link href="/" className="flex h-[94px] items-center gap-3 border-b border-[#143652] px-6 !text-white hover:opacity-100"><div className="relative flex h-11 w-11 items-center justify-center text-[#81dcff]"><Plane size={34} strokeWidth={1.35}/><span className="absolute inset-0 rounded-full border border-cyan-300/20 shadow-[0_0_24px_rgba(66,205,255,.16)]"/></div><div><p className="text-lg font-black tracking-[.03em]">DRONE PASS</p><p className="text-[8px] font-bold tracking-[.17em] text-[#7898b6]">AVIATION INTELLIGENCE</p></div></Link>
    <nav className="flex-1 py-6">{trainingNav.map((item) => { const Icon=item.icon; const active=item.href==="/study"; return <Link key={item.href} href={item.href} className={`group flex min-h-[62px] items-center gap-4 border-l-2 px-7 transition hover:bg-[#0c3159] hover:opacity-100 ${active ? "border-[#35d6ff] bg-[linear-gradient(90deg,rgba(18,105,194,.58),rgba(15,63,109,.38))] !text-white shadow-[inset_18px_0_35px_rgba(0,156,255,.1)]" : "border-transparent !text-[#aac0d4]"}`}><Icon size={21} className={active ? "text-[#67dcff]" : "text-[#7694b1] group-hover:text-[#67dcff]"} strokeWidth={1.7}/><div><p className="text-sm font-extrabold">{item.label}</p><p className="mt-0.5 text-[8px] font-bold tracking-[.15em] text-[#4f7090]">{item.english}</p></div></Link>; })}</nav>
    <div className="m-4 border border-[#19496f] bg-[#071d36] p-4"><div className="flex items-center justify-between"><TechnicalLabel>Training mode</TechnicalLabel><span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_9px_#22d3ee]"/></div><p className="mt-3 text-sm font-extrabold text-white">AVIATION COMMAND</p><p className="mt-2 text-[10px] leading-5 text-[#718da6]">Active Pack Runtime 문제를 그대로 표시합니다.</p></div>
  </aside>;
}

function TrainingHeader({ current, total }: { current: number; total: number }) {
  return <header className="sticky top-0 z-40 flex min-h-[72px] items-center justify-between border-b border-[#123b5e] bg-[#031124]/94 px-3 backdrop-blur-xl sm:px-6 xl:px-8"><div className="flex min-w-0 items-center gap-3"><Link href="/" aria-label="학습 종료 후 홈으로 이동" className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#285477] bg-[#09223d] !text-[#9bcce9] hover:border-cyan-300 hover:opacity-100"><ArrowLeft size={19}/></Link><div className="min-w-0"><TechnicalLabel tone="cyan">Training session</TechnicalLabel><p className="mt-1 hidden truncate text-xs font-semibold text-[#8ca8bf] sm:block">AVIATION COMMAND TRAINING MODE</p></div></div><div className="flex shrink-0 items-center gap-2 sm:gap-4">{total > 0 ? <div className="border border-[#174568] bg-[#061a31] px-3 py-2 text-right sm:px-4"><TechnicalLabel>Question</TechnicalLabel><p className="mt-1 text-xs font-black text-white">{String(current).padStart(2,"0")} / {String(total).padStart(2,"0")}</p></div> : null}<div className="hidden items-center gap-2 border border-cyan-300/25 bg-cyan-300/[.07] px-3 py-2 text-[9px] font-black tracking-[.12em] text-cyan-200 sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_#22d3ee]"/>SESSION ACTIVE</div></div></header>;
}

function SessionStrip({ question, index, total, correctCount, progress }: { question?: GeneratedQuestion; index: number; total: number; correctCount: number; progress: number }) {
  const sourceAvailable = Boolean(question?.sourceReferences.some((source) => Boolean(source.locator)));
  const items = [
    { label: "Question", value: total ? `${String(index + 1).padStart(2,"0")} / ${String(total).padStart(2,"0")}` : "—", icon: Radar },
    { label: "Progress", value: total ? `${Math.round(progress)}%` : "—", icon: BarChart3 },
    { label: "Domain", value: question?.subjectId || "—", icon: Scale },
    { label: "Source", value: sourceAvailable ? "TRACE AVAILABLE" : "—", icon: ShieldCheck },
  ];
  const borders = ["", "border-l", "border-t", "border-l border-t"];
  return <section className="grid grid-cols-2 border border-[#17466d] bg-[#06192f] lg:grid-cols-4">{items.map((item,indexItem)=>{const Icon=item.icon; return <div key={item.label} className={`flex min-h-[74px] items-center justify-between gap-2 border-[#143b5c] p-3 sm:min-h-[82px] sm:p-4 lg:border-t-0 ${indexItem > 0 ? "lg:border-l" : ""} ${borders[indexItem]}`}><div className="min-w-0"><TechnicalLabel tone={indexItem===0 ? "cyan" : "muted"}>{item.label}</TechnicalLabel><p className="mt-2 truncate text-[11px] font-black text-white sm:text-sm">{item.value}</p>{indexItem===1 ? <p className="mt-1 text-[9px] text-[#718da5]">정답 {correctCount}</p> : null}</div><Icon size={22} strokeWidth={1.25} className={`shrink-0 ${indexItem===0 ? "text-cyan-300" : "text-[#557894]"}`}/></div>})}<div className="col-span-full h-1 bg-[#07182b]" role="progressbar" aria-label="문제 풀이 진행률" aria-valuemin={0} aria-valuemax={total} aria-valuenow={total ? index+1 : 0}><div className="h-full bg-[linear-gradient(90deg,#0876dd,#47d6ff)] shadow-[0_0_12px_rgba(48,201,255,.55)] transition-[width] duration-500 motion-reduce:transition-none" style={{width:`${progress}%`}}/></div></section>;
}

export default function StudyPage() {
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const question = questions[index];
  const progress = questions.length > 0 ? ((index + 1) / questions.length) * 100 : 0;

  useEffect(() => {
    setQuestions(getGeneratedQuestions({ seed: "study-demo", limit: 5 }));
  }, []);

  function handleSelect(choiceId: string, correct: boolean) {
    setSelectedChoiceId(choiceId);
    if (correct) setCorrectCount((count) => count + 1);
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
    <div className="min-h-screen overflow-x-hidden bg-[#020d1c] text-white [background-image:radial-gradient(circle_at_72%_8%,rgba(17,92,154,.16),transparent_31%),linear-gradient(rgba(15,61,96,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(15,61,96,.07)_1px,transparent_1px)] [background-size:auto,48px_48px,48px_48px] xl:pl-[232px]">
      <TrainingRail />
      <div className="min-w-0"><TrainingHeader current={index+1} total={questions.length}/><main className="mx-auto w-full max-w-[1180px] space-y-4 px-3 pb-10 pt-3 sm:px-5 sm:pt-5 xl:px-7"><SessionStrip question={question} index={index} total={questions.length} correctCount={correctCount} progress={progress}/>
        {question ? (
          <QuestionCard key={question.id} question={question} selectedChoiceId={selectedChoiceId} onSelect={handleSelect} onNext={nextQuestion} questionNumber={index + 1} total={questions.length} />
        ) : (
          <section className="border border-amber-400/35 bg-[#281d10]/80 p-8 text-center shadow-[0_20px_60px_rgba(0,7,20,.3)]" aria-live="polite">
            <FileWarning className="mx-auto text-amber-400" size={34} aria-hidden="true" />
            <h1 className="mt-4 text-lg font-extrabold text-amber-200">검증 통과 문제가 없습니다</h1>
            <p className="mt-2 text-sm font-medium leading-6 text-[#b49b75]">현재 Active Pack 또는 기존 sample fallback에서 표시할 수 있는 문제를 찾지 못했습니다.</p>
          </section>
        )}

        {questions.length > 0 ? <div className="flex flex-col items-center justify-between gap-3 border border-[#153d5f] bg-[#06182d]/85 px-4 py-3 sm:flex-row"><p className="flex items-start gap-2 text-xs font-medium leading-5 text-[#7895ad]"><ShieldCheck className="mt-0.5 shrink-0 text-cyan-300" size={15} aria-hidden="true" />문제와 해설은 현재 Runtime이 제공한 데이터를 그대로 표시합니다.</p><button type="button" onClick={resetSet} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 border border-[#28577d] bg-[#08213b] px-4 text-xs font-extrabold text-[#83cfff] hover:border-cyan-300 hover:bg-[#0b2b4a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/20"><RotateCcw size={16} aria-hidden="true" /> 세트 다시 풀기</button></div> : null}
      </main></div>
    </div>
  );
}
