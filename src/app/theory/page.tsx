import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  BookOpenCheck,
  Braces,
  CloudSun,
  Database,
  FileSearch,
  GraduationCap,
  Home,
  Layers3,
  Network,
  Plane,
  Scale,
  Search,
  ShieldCheck,
  Target,
  Waypoints,
} from "lucide-react";
import { BottomNav } from "@/components/boat/BottomNav";

type DomainStatus = "PARTIAL" | "SHADOW READY" | "REVIEW REQUIRED";

type KnowledgeDomain = {
  number: string;
  label: string;
  title: string;
  description: string;
  status: DomainStatus;
  icon: LucideIcon;
  modules: string[];
  note: string;
};

const navigation = [
  { href: "/", label: "홈", technical: "COMMAND", icon: Home },
  { href: "/study", label: "문제 학습", technical: "TRAINING", icon: BookOpenCheck },
  { href: "/theory", label: "이론 학습", technical: "KNOWLEDGE", icon: GraduationCap },
  { href: "/practice", label: "연습 계획", technical: "MISSIONS", icon: Target },
  { href: "/fishing-safety", label: "비행 안전", technical: "SAFETY", icon: ShieldCheck },
  { href: "/sea-info", label: "항공 정보", technical: "FLIGHT INFO", icon: CloudSun },
  { href: "/analysis", label: "학습 분석", technical: "ANALYTICS", icon: BarChart3 },
];

const domains: KnowledgeDomain[] = [
  {
    number: "01",
    label: "LEGAL KNOWLEDGE",
    title: "법규",
    description: "검증된 법규 지식 산출물은 존재하지만 사용자용 통합 Knowledge Runtime에는 아직 연결되지 않았습니다.",
    status: "PARTIAL",
    icon: Scale,
    modules: ["RULE", "CONDITION", "EXCEPTION"],
    note: "Canonical artifact available · Runtime pending",
  },
  {
    number: "02",
    label: "WEATHER INTELLIGENCE",
    title: "기상",
    description: "기상 지식과 Shadow 검증 결과가 존재하며 Production Knowledge 탐색 연결을 준비하고 있습니다.",
    status: "SHADOW READY",
    icon: CloudSun,
    modules: ["PHENOMENON", "HAZARD", "OBSERVATION"],
    note: "Shadow runtime verified · Active connection pending",
  },
  {
    number: "03",
    label: "FLIGHT THEORY",
    title: "비행이론",
    description: "비행이론 Canonical 통합 감사가 완료됐지만 검토와 Runtime 호환 작업이 남아 있습니다.",
    status: "REVIEW REQUIRED",
    icon: Plane,
    modules: ["CONCEPT", "PRINCIPLE", "PROCEDURE"],
    note: "Integration audited · Canonical review required",
  },
];

function TechnicalLabel({ children, tone = "cyan" }: { children: React.ReactNode; tone?: "cyan" | "amber" | "muted" }) {
  const color = tone === "amber" ? "text-[#f0b64f]" : tone === "muted" ? "text-[#64829b]" : "text-[#67dfff]";
  return <span className={`text-[9px] font-bold uppercase tracking-[0.22em] ${color}`}>{children}</span>;
}

function StatusBadge({ status }: { status: DomainStatus }) {
  const amber = status === "REVIEW REQUIRED";
  const green = status === "SHADOW READY";
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[8px] font-black tracking-[0.12em] ${amber ? "border-amber-400/35 bg-amber-400/10 text-amber-300" : green ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-300" : "border-cyan-300/35 bg-cyan-300/10 text-cyan-200"}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]" />{status}
    </span>
  );
}

function KnowledgeRail() {
  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-[232px] flex-col border-r border-[#143d60] bg-[linear-gradient(180deg,#071b33,#041326_72%,#061a31)] xl:flex">
      <Link href="/" className="flex h-[94px] items-center gap-3 border-b border-[#143652] px-6 text-white transition hover:bg-[#08213b]">
        <div className="grid h-11 w-11 place-items-center rounded-full border border-cyan-300/25 bg-[#082a48] text-[#7bdeff] shadow-[0_0_24px_rgba(66,205,255,.14)]"><Plane size={26} strokeWidth={1.5} /></div>
        <div><p className="text-lg font-black tracking-[0.04em]">DRONE PASS</p><p className="text-[8px] font-bold tracking-[0.16em] text-[#7898b6]">AVIATION INTELLIGENCE</p></div>
      </Link>
      <nav className="flex-1 space-y-1 px-3 py-6" aria-label="주요 탐색">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/theory";
          return (
            <Link key={item.href} href={item.href} className={`group flex items-center gap-4 rounded-xl border px-4 py-3 transition ${active ? "border-[#167fc0] bg-[linear-gradient(90deg,rgba(10,112,206,.46),rgba(7,44,78,.56))] text-white shadow-[inset_3px_0_0_#43dcff,0_0_22px_rgba(0,144,255,.08)]" : "border-transparent text-[#8da9c3] hover:border-[#184a70] hover:bg-[#08213b] hover:text-white"}`}>
              <Icon size={21} className={active ? "text-[#58ddff]" : "text-[#7198ba] group-hover:text-[#58ddff]"} />
              <span className="min-w-0"><span className="block text-[13px] font-bold">{item.label}</span><span className="block text-[8px] font-semibold tracking-[0.15em] text-[#577998]">{item.technical}</span></span>
            </Link>
          );
        })}
      </nav>
      <div className="m-4 rounded-2xl border border-[#174d75] bg-[#061a30]/90 p-4 shadow-[inset_0_1px_0_rgba(94,221,255,.08)]">
        <TechnicalLabel>DATABASE STATUS</TechnicalLabel>
        <div className="mt-3 flex items-end justify-between gap-3"><div><p className="text-lg font-black text-white">RUNTIME</p><p className="text-[10px] text-amber-300">CONNECTION PENDING</p></div><Database size={31} className="text-[#5c91b7]" /></div>
        <div className="mt-4 h-px bg-[linear-gradient(90deg,#1b8bd0,transparent)]" />
        <p className="mt-3 text-[10px] leading-5 text-[#7899b5]">검증 산출물과 사용자 탐색 Runtime은 분리되어 있습니다.</p>
      </div>
    </aside>
  );
}

function KnowledgeHeader() {
  return (
    <header className="sticky top-0 z-40 flex min-h-[72px] items-center justify-between border-b border-[#143b5d] bg-[#031124]/94 px-4 backdrop-blur-xl sm:px-7 xl:px-9">
      <div className="min-w-0"><TechnicalLabel>KNOWLEDGE NAVIGATION</TechnicalLabel><h1 className="truncate text-base font-black tracking-[0.05em] text-white sm:text-lg">AVIATION KNOWLEDGE CENTER</h1></div>
      <div className="flex items-center gap-3"><div className="hidden border-r border-[#183c5e] pr-4 text-right sm:block"><p className="text-[8px] font-bold tracking-[0.14em] text-[#5f809d]">CANONICAL LINK</p><p className="mt-1 text-xs font-bold text-amber-300">NOT ACTIVE</p></div><div className="rounded-lg border border-[#17578a] bg-[#07203a] px-3 py-2 text-right"><p className="text-[8px] font-bold tracking-[0.16em] text-[#6386a3]">DOMAINS</p><p className="text-xs font-black text-[#5fe5ff]">03 INDEXED</p></div></div>
    </header>
  );
}

function DomainCard({ domain }: { domain: KnowledgeDomain }) {
  const Icon = domain.icon;
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-[#174866] bg-[linear-gradient(145deg,rgba(7,36,61,.96),rgba(4,20,37,.98))] p-5 shadow-[inset_0_1px_0_rgba(101,219,255,.08),0_18px_48px_rgba(0,8,22,.2)] transition hover:-translate-y-0.5 hover:border-[#2782ad]">
      <div className="pointer-events-none absolute right-0 top-0 h-16 w-16 border-r border-t border-[#2f88b9]/35 [clip-path:polygon(35%_0,100%_0,100%_65%)]" />
      <div className="flex items-start justify-between gap-4"><div className="grid h-12 w-12 place-items-center rounded-xl border border-[#2679a7] bg-[#083a61] text-[#69e1ff]"><Icon size={23} /></div><div className="text-right"><p className="font-mono text-2xl font-black text-[#31516b]">{domain.number}</p><StatusBadge status={domain.status} /></div></div>
      <p className="mt-5 text-[10px] font-bold tracking-[0.2em] text-[#63dcff]">{domain.label}</p>
      <h3 className="mt-2 text-2xl font-black text-white">{domain.title}</h3>
      <p className="mt-3 min-h-[72px] text-sm font-medium leading-6 text-[#88a4bc]">{domain.description}</p>
      <div className="mt-5 flex flex-wrap gap-2">{domain.modules.map((module) => <span key={module} className="border border-[#22506e] bg-[#08223a] px-2 py-1 text-[8px] font-bold tracking-[0.12em] text-[#7fa5c0]">{module}</span>)}</div>
      <div className="mt-5 border-t border-[#173d5c] pt-4"><p className="text-[9px] leading-5 text-[#5f7e97]">{domain.note}</p><div className="mt-3 flex items-center justify-between"><span className="text-[9px] font-black tracking-[0.14em] text-[#687f92]">DETAIL RUNTIME REQUIRED</span><span className="h-2 w-2 rounded-full bg-amber-400/70 shadow-[0_0_10px_rgba(251,191,36,.4)]" /></div></div>
    </article>
  );
}

export default function TheoryPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#020d1c] text-white [background-image:radial-gradient(circle_at_74%_8%,rgba(0,138,255,.14),transparent_30%),linear-gradient(rgba(24,86,126,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(24,86,126,.08)_1px,transparent_1px)] [background-size:auto,48px_48px,48px_48px] xl:pl-[232px]">
      <KnowledgeRail />
      <KnowledgeHeader />
      <main className="mx-auto w-full max-w-[1220px] px-4 pb-28 pt-5 sm:px-7 sm:pt-7 xl:px-9 xl:pb-12">
        <section className="relative min-h-[390px] overflow-hidden rounded-[22px] border border-[#17638f] bg-[linear-gradient(115deg,rgba(5,29,53,.98),rgba(4,48,80,.87)_58%,rgba(2,16,32,.98))] p-6 shadow-[0_24px_80px_rgba(0,79,143,.2),inset_0_1px_0_rgba(116,226,255,.12)] sm:p-9">
          <div className="pointer-events-none absolute inset-0 bg-[url('/images/home/drone-command-hero.png')] bg-cover bg-[position:72%_center] opacity-55 sm:bg-[position:66%_center]" aria-hidden="true" />
          <video
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[68%_center] opacity-80 motion-reduce:hidden sm:object-[62%_center] lg:object-center"
            poster="/images/home/drone-command-hero.png"
            autoPlay
            muted
            playsInline
            loop
            preload="metadata"
            aria-hidden="true"
          >
            <source src="/videos/theory/aviation-intelligence-interface-loop.mp4" type="video/mp4" />
          </video>
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(2,13,29,.92)_0%,rgba(3,19,38,.82)_43%,rgba(3,18,34,.36)_72%,rgba(2,12,26,.58)_100%)]" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(67,192,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(67,192,255,.12)_1px,transparent_1px)] [background-size:46px_46px] [mask-image:linear-gradient(to_bottom,transparent,black_22%,black_88%)]" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_80%_50%,transparent_0,transparent_58px,rgba(44,203,255,.22)_59px,transparent_60px),radial-gradient(circle_at_80%_50%,transparent_0,transparent_112px,rgba(44,203,255,.13)_113px,transparent_114px),radial-gradient(circle_at_80%_50%,transparent_0,transparent_168px,rgba(44,203,255,.08)_169px,transparent_170px)]" />
          <svg className="pointer-events-none absolute right-0 top-0 hidden h-full w-[58%] opacity-70 md:block" viewBox="0 0 620 390" fill="none" aria-hidden="true"><path d="M40 320 165 238l106 34 93-127 138 48 82-114" stroke="#25cfff" strokeWidth="1.2" opacity=".6"/><path d="M40 320 165 238l106 34 93-127 138 48 82-114" stroke="#0a72d8" strokeWidth="12" opacity=".1"/>{[[165,238],[271,272],[364,145],[502,193]].map(([x,y]) => <g key={`${x}-${y}`}><circle cx={x} cy={y} r="7" fill="#05203a" stroke="#62e5ff" strokeWidth="2"/><circle cx={x} cy={y} r="18" stroke="#62e5ff" opacity=".2"/></g>)}</svg>
          <div className="relative z-10 flex min-h-[330px] max-w-[680px] flex-col justify-between">
            <div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full border border-[#2586bd] bg-[#07365c] text-[#62e4ff]"><Network size={17} /></span><TechnicalLabel>KNOWLEDGE DATABASE / NAVIGATION</TechnicalLabel></div>
            <div className="py-9"><p className="text-[10px] font-black tracking-[0.25em] text-[#75beff]">DRONE PASS · AVIATION LIBRARY</p><h2 className="mt-4 text-4xl font-black leading-[.98] tracking-[-.04em] text-white sm:text-6xl">KNOWLEDGE<br/><span className="text-[#68ddff]">CENTER</span></h2><p className="mt-5 max-w-xl text-sm font-medium leading-7 text-[#a7bed1] sm:text-base">법규, 기상, 비행이론 기반의 드론 자격시험 지식을 탐색하는 공간입니다. 검증된 데이터가 사용자 Runtime에 연결될 때 학습 가능한 형태로 제공됩니다.</p></div>
            <div className="flex flex-wrap items-center gap-3 border-t border-cyan-200/15 pt-4"><span className="inline-flex items-center gap-2 text-[9px] font-bold tracking-[0.14em] text-[#77a3c1]"><Waypoints size={15} className="text-[#59dcff]" /> DOMAIN MAP READY</span><span className="inline-flex items-center gap-2 text-[9px] font-bold tracking-[0.14em] text-amber-300"><Activity size={15} /> CONTENT RUNTIME PENDING</span></div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-[#153e5e] bg-[#06172a]/94 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div className="flex min-h-12 flex-1 items-center gap-3 rounded-lg border border-[#234c69] bg-[#071d32] px-4 text-[#66859e]"><Search size={18} /><span className="text-sm font-medium">지식 검색 기능 준비 중</span></div><button type="button" disabled className="min-h-12 rounded-lg border border-[#2b4b62] bg-[#102333] px-5 text-xs font-black text-[#61798d] disabled:cursor-not-allowed">SEARCH NOT CONNECTED</button></div>
          <p className="mt-3 flex items-start gap-2 text-[10px] leading-5 text-[#607f98]"><FileSearch size={14} className="mt-0.5 shrink-0" />검색 Backend와 Canonical detail Runtime이 연결되기 전에는 결과를 생성하거나 표시하지 않습니다.</p>
        </section>

        <section className="mt-8"><div className="flex items-end justify-between gap-4"><div><TechnicalLabel>DOMAIN NAVIGATION</TechnicalLabel><h2 className="mt-2 text-2xl font-black text-white">지식 영역</h2></div><p className="hidden text-right text-xs leading-5 text-[#6888a2] sm:block">산출물 상태와 사용자 Runtime 상태를<br/>구분해서 표시합니다.</p></div><div className="mt-4 grid gap-4 lg:grid-cols-3">{domains.map((domain) => <DomainCard key={domain.number} domain={domain} />)}</div></section>

        <section className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
          <article className="rounded-2xl border border-[#174a70] bg-[#06182b]/95 p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><TechnicalLabel>KNOWLEDGE MODULES</TechnicalLabel><h2 className="mt-2 text-xl font-black text-white">학습 구조 미리보기</h2></div><Layers3 size={28} className="text-[#59dcff]" /></div><p className="mt-4 text-sm leading-6 text-[#819eb6]">현재 Canonical 구조에서 사용하는 지식 유형을 Domain별 탐색 체계로 준비했습니다. 상세 항목은 Runtime 연결 전까지 노출하지 않습니다.</p><div className="mt-5 grid gap-3 sm:grid-cols-3">{domains.map((domain) => <div key={domain.number} className="rounded-xl border border-[#173e5d] bg-[#071e35] p-4"><p className="text-[9px] font-black tracking-[0.15em] text-[#63d9fb]">{domain.label}</p><p className="mt-3 text-sm font-black text-white">{domain.title}</p><p className="mt-2 text-[10px] leading-5 text-[#718fa8]">{domain.modules.join(" · ")}</p><p className="mt-3 text-[8px] font-bold tracking-[0.12em] text-amber-300">DETAIL PENDING</p></div>)}</div></article>
          <article className="rounded-2xl border border-[#755326] bg-[linear-gradient(145deg,rgba(48,34,18,.86),rgba(16,24,35,.96))] p-5 sm:p-6"><div className="flex items-start justify-between"><div><TechnicalLabel tone="amber">CONTINUE LEARNING</TechnicalLabel><h2 className="mt-2 text-xl font-black">학습 경로 연결 대기</h2></div><Braces size={27} className="text-amber-400" /></div><div className="mt-5 flex min-h-[178px] flex-col items-center justify-center border border-amber-500/25 bg-amber-500/[.04] p-5 text-center"><Database size={34} className="text-amber-400" strokeWidth={1.3}/><p className="mt-4 text-sm font-black text-amber-200">최근 이론 학습이 없습니다</p><p className="mt-2 text-xs leading-5 text-[#ad987a]">Attempt와 Knowledge detail Runtime이 연결되면 이어서 학습할 개념이 표시됩니다.</p><Link href="/study" className="mt-5 inline-flex min-h-10 items-center justify-center border border-amber-400/50 px-4 text-xs font-black text-amber-300 transition hover:bg-amber-400/10">문제 학습으로 이동</Link></div></article>
        </section>

        <section className="mt-4 rounded-2xl border border-[#153e5e] bg-[#05172a]/94 p-6"><div className="flex flex-col items-center justify-center py-7 text-center"><div className="grid h-14 w-14 place-items-center rounded-full border border-[#245777] bg-[#082139] text-[#7196b5]"><Database size={27} /></div><TechnicalLabel>KNOWLEDGE DATABASE</TechnicalLabel><h2 className="mt-2 text-lg font-black">사용자 지식 Runtime 연결 준비 중</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#7693ab]">검증된 Canonical 지식이 통합 Runtime과 상세 화면에 연결되면 탐색 가능한 Knowledge Node가 이곳에 표시됩니다. 현재는 가짜 목록이나 개발용 수치를 표시하지 않습니다.</p></div></section>
      </main>
      <BottomNav />
    </div>
  );
}
