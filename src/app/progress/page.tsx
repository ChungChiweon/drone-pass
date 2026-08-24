import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  ChartNoAxesCombined,
  CircleAlert,
  Clock3,
  CloudSun,
  Database,
  Gauge,
  GraduationCap,
  History,
  Home,
  LineChart,
  Plane,
  Radar,
  Scale,
  ShieldCheck,
  Target,
  Waypoints,
} from "lucide-react";
import { BottomNav } from "@/components/boat/BottomNav";

type SubjectState = {
  label: string;
  technical: string;
  icon: LucideIcon;
};

const navigation = [
  { href: "/", label: "홈", technical: "COMMAND", icon: Home },
  { href: "/study", label: "문제 학습", technical: "TRAINING", icon: BookOpenCheck },
  { href: "/theory", label: "이론 학습", technical: "KNOWLEDGE", icon: GraduationCap },
  { href: "/practice", label: "연습 계획", technical: "MISSIONS", icon: Target },
  { href: "/fishing-safety", label: "비행 안전", technical: "SAFETY", icon: ShieldCheck },
  { href: "/sea-info", label: "항공 정보", technical: "FLIGHT INFO", icon: CloudSun },
  { href: "/progress", label: "학습 현황", technical: "READINESS", icon: BarChart3 },
];

const subjects: SubjectState[] = [
  { label: "법규", technical: "LEGAL KNOWLEDGE", icon: Scale },
  { label: "기상", technical: "WEATHER INTELLIGENCE", icon: CloudSun },
  { label: "비행이론", technical: "FLIGHT THEORY", icon: Plane },
];

function TechnicalLabel({ children, tone = "cyan" }: { children: React.ReactNode; tone?: "cyan" | "amber" | "muted" }) {
  const color = tone === "amber" ? "text-[#f0b64f]" : tone === "muted" ? "text-[#64829b]" : "text-[#67dfff]";
  return <span className={`text-[9px] font-bold uppercase tracking-[0.22em] ${color}`}>{children}</span>;
}

function ProgressRail() {
  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-[232px] flex-col border-r border-[#143d60] bg-[linear-gradient(180deg,#071b33,#041326_72%,#061a31)] xl:flex">
      <Link href="/" className="flex h-[94px] items-center gap-3 border-b border-[#143652] px-6 text-white transition hover:bg-[#08213b]">
        <div className="grid h-11 w-11 place-items-center rounded-full border border-cyan-300/25 bg-[#082a48] text-[#7bdeff] shadow-[0_0_24px_rgba(66,205,255,.14)]"><Plane size={26} strokeWidth={1.5} /></div>
        <div><p className="text-lg font-black tracking-[0.04em]">DRONE PASS</p><p className="text-[8px] font-bold tracking-[0.16em] text-[#7898b6]">AVIATION INTELLIGENCE</p></div>
      </Link>
      <nav className="flex-1 space-y-1 px-3 py-6" aria-label="주요 탐색">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/progress";
          return (
            <Link key={item.href} href={item.href} className={`group flex items-center gap-4 rounded-xl border px-4 py-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 ${active ? "border-[#167fc0] bg-[linear-gradient(90deg,rgba(10,112,206,.46),rgba(7,44,78,.56))] text-white shadow-[inset_3px_0_0_#43dcff,0_0_22px_rgba(0,144,255,.08)]" : "border-transparent text-[#8da9c3] hover:border-[#184a70] hover:bg-[#08213b] hover:text-white"}`}>
              <Icon size={21} className={active ? "text-[#58ddff]" : "text-[#7198ba] group-hover:text-[#58ddff]"} />
              <span className="min-w-0"><span className="block text-[13px] font-bold">{item.label}</span><span className="block text-[8px] font-semibold tracking-[0.15em] text-[#577998]">{item.technical}</span></span>
            </Link>
          );
        })}
      </nav>
      <div className="m-4 rounded-2xl border border-[#174d75] bg-[#061a30]/90 p-4 shadow-[inset_0_1px_0_rgba(94,221,255,.08)]">
        <TechnicalLabel>LEARNER DATA</TechnicalLabel>
        <div className="mt-3 flex items-end justify-between gap-3"><div><p className="text-lg font-black text-white">STATUS</p><p className="text-[10px] text-amber-300">DATA PENDING</p></div><Database size={31} className="text-[#5c91b7]" /></div>
        <div className="mt-4 h-px bg-[linear-gradient(90deg,#1b8bd0,transparent)]" />
        <p className="mt-3 text-[10px] leading-5 text-[#7899b5]">Attempt와 Mastery가 사용자 화면에 연결되지 않았습니다.</p>
      </div>
    </aside>
  );
}

function ProgressHeader() {
  return (
    <header className="sticky top-0 z-40 flex min-h-[72px] items-center justify-between border-b border-[#143b5d] bg-[#031124]/94 px-4 backdrop-blur-xl sm:px-7 xl:px-9">
      <div className="min-w-0"><TechnicalLabel>TRAINING READINESS</TechnicalLabel><h1 className="truncate text-base font-black tracking-[0.05em] text-white sm:text-lg">MASTERY COMMAND CENTER</h1></div>
      <div className="rounded-lg border border-amber-400/30 bg-amber-400/[.08] px-3 py-2 text-right"><p className="text-[8px] font-bold tracking-[0.16em] text-[#a88a55]">ANALYSIS</p><p className="text-xs font-black text-amber-300">DATA PENDING</p></div>
    </header>
  );
}

function ReadinessGauge() {
  return (
    <div className="relative grid h-[210px] w-[250px] place-items-center" role="img" aria-label="시험 준비도 분석을 위한 학습 데이터가 아직 연결되지 않았습니다">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 250 210" fill="none" aria-hidden="true">
        <path d="M28 158a100 100 0 0 1 194 0" stroke="#153f5d" strokeWidth="17" strokeLinecap="round" />
        <path d="M39 151a90 90 0 0 1 172 0" stroke="#2687b2" strokeWidth="2" strokeDasharray="4 9" opacity=".7" />
        <path d="M70 91 57 77M180 91l13-14M125 63V44" stroke="#4d84a5" strokeWidth="1.5" />
        <circle cx="125" cy="158" r="7" fill="#08213a" stroke="#6fdfff" strokeWidth="2" />
        <path d="M125 158 89 120" stroke="#5bdfff" strokeWidth="2" opacity=".35" />
      </svg>
      <div className="relative mt-14 text-center"><p className="text-[9px] font-bold tracking-[.18em] text-[#66849d]">READINESS</p><p className="mt-1 text-5xl font-black tracking-[-.06em] text-white">--</p><p className="mt-2 text-[9px] font-black tracking-[.14em] text-amber-300">ANALYSIS PENDING</p></div>
    </div>
  );
}

function SubjectStatus() {
  return (
    <section className="rounded-2xl border border-[#174a70] bg-[#06182b]/95 p-5 shadow-[inset_0_1px_0_rgba(90,214,255,.08)] sm:p-6">
      <div className="flex items-start justify-between"><div><TechnicalLabel>SUBJECT STATUS</TechnicalLabel><h2 className="mt-2 text-xl font-black text-white">과목별 학습 상태</h2></div><ChartNoAxesCombined size={27} className="text-[#61dfff]" /></div>
      <div className="mt-5 space-y-3">{subjects.map((subject) => { const Icon = subject.icon; return <article key={subject.label} className="grid gap-3 rounded-xl border border-[#173e5d] bg-[#071e35] p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center"><div className="grid h-11 w-11 place-items-center border border-[#286789] bg-[#0a3152] text-[#72dfff]"><Icon size={21}/></div><div><h3 className="text-sm font-black text-white">{subject.label}</h3><p className="mt-1 text-[8px] font-bold tracking-[.14em] text-[#5d7d97]">{subject.technical}</p><p className="mt-2 text-[10px] text-[#7895aa]">아직 충분한 학습 기록이 없습니다.</p></div><div className="text-left sm:text-right"><p className="text-xl font-black text-[#9cb3c5]">--</p><p className="text-[8px] font-bold tracking-[.12em] text-amber-300">DATA PENDING</p></div></article>; })}</div>
    </section>
  );
}

export default function ProgressPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#020d1c] text-white [background-image:radial-gradient(circle_at_72%_7%,rgba(0,129,231,.12),transparent_30%),linear-gradient(rgba(24,86,126,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(24,86,126,.08)_1px,transparent_1px)] [background-size:auto,48px_48px,48px_48px] xl:pl-[232px]">
      <ProgressRail />
      <ProgressHeader />
      <main className="mx-auto w-full max-w-[1220px] px-4 pb-28 pt-5 sm:px-7 sm:pt-7 xl:px-9 xl:pb-12">
        <section className="grid gap-4 lg:grid-cols-12">
          <article className="relative overflow-hidden rounded-[22px] border border-[#17638f] bg-[linear-gradient(120deg,rgba(5,31,55,.98),rgba(5,47,77,.88)_62%,rgba(3,18,34,.98))] p-6 shadow-[0_24px_80px_rgba(0,79,143,.18),inset_0_1px_0_rgba(116,226,255,.1)] sm:p-8 lg:col-span-8">
            <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(67,192,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(67,192,255,.12)_1px,transparent_1px)] [background-size:42px_42px]" aria-hidden="true" />
            <div className="relative z-10 grid min-h-[330px] items-center gap-4 sm:grid-cols-[1fr_auto]"><div><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full border border-[#2586bd] bg-[#07365c] text-[#62e4ff]"><Gauge size={17}/></span><TechnicalLabel>READINESS COMMAND PANEL</TechnicalLabel></div><h2 className="mt-6 text-4xl font-black leading-[.98] tracking-[-.04em] text-white sm:text-5xl">TRAINING<br/><span className="text-[#68ddff]">READINESS</span></h2><p className="mt-5 max-w-xl text-sm font-medium leading-7 text-[#a7bed1] sm:text-base">학습 데이터가 쌓이면 시험 준비도와 영역별 숙련도를 분석합니다. 현재는 사용자 Attempt가 저장되지 않아 수치를 계산하지 않습니다.</p><Link href="/study" className="mt-7 inline-flex min-h-12 items-center justify-center gap-3 rounded-lg border border-[#54ddff] bg-[linear-gradient(135deg,#1288ef,#075bc4)] px-5 text-sm font-black text-white shadow-[0_0_24px_rgba(37,178,255,.24)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60">문제풀이 시작 <ArrowRight size={18}/></Link></div><ReadinessGauge /></div>
          </article>

          <aside className="rounded-2xl border border-[#174a70] bg-[#06182b]/95 p-5 sm:p-6 lg:col-span-4" aria-label="학습 데이터 상태"><div className="flex items-start justify-between"><div><TechnicalLabel>TRAINING DATA</TechnicalLabel><h2 className="mt-2 text-xl font-black text-white">데이터 연결 상태</h2></div><Database size={27} className="text-[#5edcff]"/></div><div className="mt-5 divide-y divide-[#173d5c] border-y border-[#173d5c]">{[["ATTEMPT HISTORY","NOT CONNECTED"],["MASTERY STATE","NOT CONNECTED"],["SESSION TIMELINE","NOT CONNECTED"],["WEAK TOPIC","ANALYSIS PENDING"]].map(([label,value],index)=><div key={label} className="flex items-center justify-between gap-4 py-3"><p className="text-[9px] font-bold tracking-[.13em] text-[#66869f]">{label}</p><p className={`text-right text-[9px] font-black tracking-[.1em] ${index===3?"text-amber-300":"text-[#7894aa]"}`}>{value}</p></div>)}</div><div className="mt-6 flex min-h-[126px] flex-col items-center justify-center border border-dashed border-[#28516e] bg-[#071b2e]/65 p-4 text-center"><Activity size={27} className="text-[#628aa6]"/><p className="mt-3 text-sm font-black text-[#b7ccdb]">학습 기록 분석 대기</p><p className="mt-2 text-[10px] leading-5 text-[#718da3]">첫 문제풀이 완료 후에도 저장 연결 전에는 기록이 유지되지 않습니다.</p></div></aside>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <SubjectStatus />
          <article className="rounded-2xl border border-[#174a70] bg-[#06182b]/95 p-5 sm:p-6"><div className="flex items-start justify-between"><div><TechnicalLabel>KNOWLEDGE MAP</TechnicalLabel><h2 className="mt-2 text-xl font-black text-white">숙련도 시각화 준비 중</h2></div><Radar size={27} className="text-[#61dfff]"/></div><div className="relative mt-5 min-h-[310px] overflow-hidden border border-[#1b4c6d] bg-[#041527] [background-image:linear-gradient(rgba(60,166,219,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(60,166,219,.07)_1px,transparent_1px)] [background-size:34px_34px]" role="img" aria-label="학습 기록이 연결되면 영역별 숙련도를 시각화합니다"><div className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/15"><div className="absolute inset-[20%] rounded-full border border-cyan-300/12"/><div className="absolute inset-[40%] rounded-full border border-cyan-300/18"/><div className="absolute left-1/2 top-0 h-full w-px bg-cyan-300/10"/><div className="absolute left-0 top-1/2 h-px w-full bg-cyan-300/10"/></div><div className="relative z-10 flex min-h-[310px] flex-col items-center justify-center p-7 text-center"><Waypoints size={36} strokeWidth={1.2} className="text-[#6bbce8]"/><p className="mt-5 text-sm font-black text-[#c2d7e6]">Mastery data is not connected</p><p className="mt-2 max-w-md text-xs leading-5 text-[#718fa7]">실제 Attempt와 Knowledge 숙련도가 연결되기 전에는 Radar 또는 영역 점수를 생성하지 않습니다.</p></div></div></article>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-3">
          <article className="rounded-2xl border border-[#755326] bg-[linear-gradient(145deg,rgba(48,34,18,.86),rgba(16,24,35,.96))] p-5 sm:p-6"><div className="flex items-start justify-between"><div><TechnicalLabel tone="amber">ATTENTION ANALYSIS</TechnicalLabel><h2 className="mt-2 text-xl font-black text-white">취약 영역 분석 대기</h2></div><CircleAlert size={27} className="text-amber-400"/></div><p className="mt-5 text-sm leading-6 text-[#b5a58d]">현재 분석 가능한 취약 영역이 없습니다. 문제풀이 기록이 연결되면 검토 우선순위를 제공합니다.</p><Link href="/study" className="mt-5 inline-flex min-h-11 items-center gap-2 border border-amber-400/55 bg-amber-400/[.08] px-4 text-xs font-black text-amber-300 transition hover:bg-amber-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60">문제풀이 시작 <ArrowRight size={15}/></Link></article>
          <article className="rounded-2xl border border-[#174a70] bg-[#06182b]/95 p-5 sm:p-6"><div className="flex items-start justify-between"><div><TechnicalLabel>RECENT ACTIVITY</TechnicalLabel><h2 className="mt-2 text-xl font-black text-white">최근 학습 기록 없음</h2></div><History size={27} className="text-[#6194b7]"/></div><div className="mt-5 flex min-h-[142px] flex-col items-center justify-center border border-dashed border-[#28516e] bg-[#071b2e]/65 p-4 text-center"><Clock3 size={29} className="text-[#628aa6]"/><p className="mt-3 text-xs leading-5 text-[#7895aa]">세션과 Attempt 이력이 연결되면 실제 최근 활동이 표시됩니다.</p></div></article>
          <article className="rounded-2xl border border-[#174a70] bg-[#06182b]/95 p-5 sm:p-6"><div className="flex items-start justify-between"><div><TechnicalLabel>PERFORMANCE TREND</TechnicalLabel><h2 className="mt-2 text-xl font-black text-white">추이 분석 준비 중</h2></div><LineChart size={27} className="text-[#6194b7]"/></div><div className="relative mt-5 min-h-[142px] overflow-hidden border border-dashed border-[#28516e] bg-[#071b2e]/65 p-4"><svg className="absolute inset-0 h-full w-full opacity-30" viewBox="0 0 300 140" fill="none" aria-hidden="true"><path d="M20 112H280M20 70H280M20 28H280" stroke="#38627e" strokeDasharray="3 7"/><path d="M38 100 92 87l55 5 54-38 61 11" stroke="#4ebee8" strokeWidth="1.5" strokeDasharray="4 8"/></svg><div className="relative z-10 flex min-h-[110px] items-end justify-center text-center"><p className="text-xs leading-5 text-[#7895aa]">충분한 시계열 기록이 쌓이면<br/>성과 변화를 표시합니다.</p></div></div></article>
        </section>

        <section className="mt-4 flex flex-col gap-5 rounded-2xl border border-[#17618c] bg-[linear-gradient(100deg,rgba(5,37,63,.98),rgba(6,25,45,.98))] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><TechnicalLabel>NEXT TRAINING</TechnicalLabel><h2 className="mt-2 text-xl font-black text-white">현재 연결 가능한 기본 학습 세션</h2><p className="mt-2 text-sm leading-6 text-[#819eb6]">개인화 추천 대신 실제 Runtime이 지원하는 기본 5문제 훈련을 제공합니다.</p></div><div className="flex flex-col gap-2 min-[440px]:flex-row"><Link href="/practice" className="inline-flex min-h-11 items-center justify-center border border-[#2d668c] bg-[#08223b] px-4 text-xs font-black text-[#8acff0] transition hover:border-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60">훈련 계획 보기</Link><Link href="/study" className="inline-flex min-h-11 items-center justify-center gap-2 border border-[#54ddff] bg-[#0b71d5] px-4 text-xs font-black text-white transition hover:bg-[#1688ed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60">기본 문제 훈련 시작 <ArrowRight size={15}/></Link></div></section>
      </main>
      <BottomNav />
    </div>
  );
}
