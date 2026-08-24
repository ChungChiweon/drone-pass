import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Braces,
  CloudSun,
  Database,
  FileSearch,
  GraduationCap,
  Home,
  Link2,
  Network,
  Plane,
  Scale,
  ShieldCheck,
  Target,
  Waypoints,
} from "lucide-react";
import { BottomNav } from "@/components/boat/BottomNav";

type PageProps = {
  params: Promise<{ tag: string }>;
};

type StatusItem = {
  label: string;
  value: string;
  tone: "cyan" | "amber" | "muted";
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

const statusItems: StatusItem[] = [
  { label: "CONTENT RUNTIME", value: "NOT CONNECTED", tone: "amber" },
  { label: "SOURCE TRACE", value: "PENDING", tone: "muted" },
  { label: "RELATIONSHIPS", value: "PENDING", tone: "muted" },
  { label: "VISUAL ASSET", value: "PENDING", tone: "muted" },
  { label: "TRAINING LINK", value: "BASE SESSION ONLY", tone: "cyan" },
];

function TechnicalLabel({ children, tone = "cyan" }: { children: React.ReactNode; tone?: "cyan" | "amber" | "muted" }) {
  const color = tone === "amber" ? "text-[#f0b64f]" : tone === "muted" ? "text-[#64829b]" : "text-[#67dfff]";
  return <span className={`text-[9px] font-bold uppercase tracking-[0.22em] ${color}`}>{children}</span>;
}

function BriefingRail() {
  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-[232px] flex-col border-r border-[#143d60] bg-[linear-gradient(180deg,#071b33,#041326_72%,#061a31)] xl:flex">
      <Link href="/" className="flex h-[94px] items-center gap-3 border-b border-[#143652] px-6 text-white transition hover:bg-[#08213b]">
        <div className="grid h-11 w-11 place-items-center rounded-full border border-cyan-300/25 bg-[#082a48] text-[#7bdeff] shadow-[0_0_24px_rgba(66,205,255,.14)]"><Plane size={26} strokeWidth={1.5} /></div>
        <div><p className="text-lg font-black tracking-[0.04em]">DRONE PASS</p><p className="text-[8px] font-bold tracking-[0.16em] text-[#7898b6]">AVIATION INTELLIGENCE</p></div>
      </Link>
      <nav className="flex-1 space-y-1 px-3 py-6" aria-label="주요 탐색">
        {navigation.map((item) => {
          const Icon: LucideIcon = item.icon;
          const active = item.href === "/theory";
          return (
            <Link key={item.href} href={item.href} className={`group flex items-center gap-4 rounded-xl border px-4 py-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 ${active ? "border-[#167fc0] bg-[linear-gradient(90deg,rgba(10,112,206,.46),rgba(7,44,78,.56))] text-white shadow-[inset_3px_0_0_#43dcff,0_0_22px_rgba(0,144,255,.08)]" : "border-transparent text-[#8da9c3] hover:border-[#184a70] hover:bg-[#08213b] hover:text-white"}`}>
              <Icon size={21} className={active ? "text-[#58ddff]" : "text-[#7198ba] group-hover:text-[#58ddff]"} />
              <span className="min-w-0"><span className="block text-[13px] font-bold">{item.label}</span><span className="block text-[8px] font-semibold tracking-[0.15em] text-[#577998]">{item.technical}</span></span>
            </Link>
          );
        })}
      </nav>
      <div className="m-4 rounded-2xl border border-[#174d75] bg-[#061a30]/90 p-4 shadow-[inset_0_1px_0_rgba(94,221,255,.08)]">
        <TechnicalLabel>BRIEFING STATUS</TechnicalLabel>
        <div className="mt-3 flex items-end justify-between gap-3"><div><p className="text-lg font-black text-white">DETAIL</p><p className="text-[10px] text-amber-300">RUNTIME PENDING</p></div><FileSearch size={31} className="text-[#5c91b7]" /></div>
        <div className="mt-4 h-px bg-[linear-gradient(90deg,#1b8bd0,transparent)]" />
        <p className="mt-3 text-[10px] leading-5 text-[#7899b5]">경로 값은 Canonical Knowledge로 간주하지 않습니다.</p>
      </div>
    </aside>
  );
}

function BriefingHeader() {
  return (
    <header className="sticky top-0 z-40 flex min-h-[72px] items-center justify-between border-b border-[#143b5d] bg-[#031124]/94 px-4 backdrop-blur-xl sm:px-7 xl:px-9">
      <div className="min-w-0"><TechnicalLabel>KNOWLEDGE BRIEFING</TechnicalLabel><h1 className="truncate text-base font-black tracking-[0.05em] text-white sm:text-lg">AVIATION BRIEFING ROOM</h1></div>
      <div className="rounded-lg border border-amber-400/30 bg-amber-400/[.08] px-3 py-2 text-right"><p className="text-[8px] font-bold tracking-[0.16em] text-[#a88a55]">CONTENT LINK</p><p className="text-xs font-black text-amber-300">PENDING</p></div>
    </header>
  );
}

function StatusConsole() {
  return (
    <aside className="rounded-2xl border border-[#174a70] bg-[#06182b]/95 p-5 shadow-[inset_0_1px_0_rgba(90,214,255,.08)] sm:p-6" aria-label="Knowledge 연결 상태">
      <div className="flex items-start justify-between"><div><TechnicalLabel>KNOWLEDGE STATUS</TechnicalLabel><h2 className="mt-2 text-xl font-black text-white">연결 상태</h2></div><Database size={28} className="text-[#61dfff]" /></div>
      <div className="mt-5 divide-y divide-[#173d5c] border-y border-[#173d5c]">
        {statusItems.map((item) => <div key={item.label} className="flex items-center justify-between gap-4 py-3"><p className="text-[9px] font-bold tracking-[0.13em] text-[#66869f]">{item.label}</p><p className={`text-right text-[9px] font-black tracking-[0.1em] ${item.tone === "amber" ? "text-amber-300" : item.tone === "cyan" ? "text-cyan-300" : "text-[#7894aa]"}`}>{item.value}</p></div>)}
      </div>
      <p className="mt-4 text-[10px] leading-5 text-[#6e8aa1]">상태값은 현재 감사된 사용자 Runtime 연결 상태만 반영합니다.</p>
    </aside>
  );
}

function safeRouteReference(tag: string) {
  const cleaned = tag.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (!cleaned) return "UNRESOLVED ROUTE";
  return cleaned.length > 120 ? `${cleaned.slice(0, 117)}…` : cleaned;
}

export default async function TheoryTagPage({ params }: PageProps) {
  const { tag } = await params;
  const routeReference = safeRouteReference(tag);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#020d1c] text-white [background-image:radial-gradient(circle_at_72%_7%,rgba(0,129,231,.12),transparent_30%),linear-gradient(rgba(24,86,126,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(24,86,126,.08)_1px,transparent_1px)] [background-size:auto,48px_48px,48px_48px] xl:pl-[232px]">
      <BriefingRail />
      <BriefingHeader />
      <main className="mx-auto w-full max-w-[1220px] px-4 pb-28 pt-5 sm:px-7 sm:pt-7 xl:px-9 xl:pb-12">
        <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-2 text-[10px] font-bold tracking-[0.12em] text-[#66849c]">
          <Link href="/theory" className="text-[#71dfff] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60">THEORY</Link><span aria-hidden="true">/</span><span>KNOWLEDGE DETAIL</span>
        </nav>

        <section className="relative mt-4 overflow-hidden rounded-[22px] border border-[#17638f] bg-[linear-gradient(120deg,rgba(5,31,55,.98),rgba(5,47,77,.86)_62%,rgba(3,18,34,.98))] p-6 shadow-[0_24px_80px_rgba(0,79,143,.18),inset_0_1px_0_rgba(116,226,255,.1)] sm:p-9">
          <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(67,192,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(67,192,255,.12)_1px,transparent_1px)] [background-size:42px_42px] [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_90%)]" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-28 -top-24 h-[420px] w-[420px] rounded-full border border-cyan-300/15 shadow-[inset_0_0_70px_rgba(36,189,255,.06)]" aria-hidden="true"><div className="absolute inset-[18%] rounded-full border border-cyan-300/12"/><div className="absolute inset-[37%] rounded-full border border-cyan-300/18"/><span className="absolute left-[27%] top-[62%] h-2 w-2 rounded-full bg-cyan-300/70 shadow-[0_0_14px_#22d3ee] motion-safe:animate-pulse"/></div>
          <div className="relative z-10 max-w-3xl"><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full border border-[#2586bd] bg-[#07365c] text-[#62e4ff]"><Braces size={17}/></span><TechnicalLabel>KNOWLEDGE BRIEFING / SAFE STATE</TechnicalLabel></div><h2 className="mt-7 text-3xl font-black leading-[1.04] tracking-[-.035em] text-white sm:text-5xl">KNOWLEDGE<br/><span className="text-[#68ddff]">RUNTIME PENDING</span></h2><p className="mt-5 max-w-2xl text-sm font-medium leading-7 text-[#a7bed1] sm:text-base">검증된 Knowledge Runtime이 연결되면 개념 설명과 출처, 연관 지식을 이 화면에서 제공합니다. 현재 경로의 tag를 지식 제목이나 Canonical ID로 간주하지 않습니다.</p><div className="mt-7 max-w-xl border-l-2 border-[#2ca5d7] bg-[#071d32]/70 px-4 py-3"><p className="text-[8px] font-bold tracking-[0.15em] text-[#62829b]">ROUTE REFERENCE · NOT A CANONICAL IDENTIFIER</p><p className="mt-2 break-all font-mono text-xs text-[#9ab6cc]">{routeReference}</p></div></div>
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-8">
            <section className="rounded-2xl border border-[#174a70] bg-[#06182b]/95 p-5 sm:p-6"><div className="flex items-start justify-between"><div><TechnicalLabel>VISUAL BRIEFING</TechnicalLabel><h2 className="mt-2 text-xl font-black text-white">시각 학습 자료 연결 대기</h2></div><Network size={27} className="text-[#5edcff]"/></div><div className="relative mt-5 min-h-[260px] overflow-hidden border border-[#1b4c6d] bg-[#041527] [background-image:linear-gradient(rgba(60,166,219,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(60,166,219,.08)_1px,transparent_1px)] [background-size:34px_34px]"><svg className="absolute inset-0 h-full w-full" viewBox="0 0 700 260" fill="none" aria-hidden="true"><path d="M96 188 224 84l129 77 139-102 119 109" stroke="#2bcfff" strokeWidth="1" opacity=".4" strokeDasharray="5 7"/>{[[96,188],[224,84],[353,161],[492,59],[611,168]].map(([x,y], index)=><g key={`${x}-${y}`}><circle cx={x} cy={y} r={index===2?8:5} fill="#06192d" stroke="#68dfff" strokeWidth="1.5"/><circle cx={x} cy={y} r={index===2?24:15} stroke="#68dfff" opacity=".13"/></g>)}</svg><div className="relative z-10 flex min-h-[260px] flex-col items-center justify-center p-7 text-center"><Waypoints size={38} strokeWidth={1.2} className="text-[#6bbce8]"/><p className="mt-5 text-sm font-black text-[#c2d7e6]">Visual asset is not connected</p><p className="mt-2 max-w-md text-xs leading-5 text-[#718fa7]">이 도식은 실제 개념 관계를 표현하지 않는 인터페이스 배경입니다. 검증된 시각 자료가 Runtime에서 전달될 때 교체됩니다.</p></div></div></section>

            <section className="grid gap-4 md:grid-cols-2"><article className="rounded-2xl border border-[#174a70] bg-[#06182b]/95 p-5 sm:p-6"><TechnicalLabel>KEY IDEA</TechnicalLabel><h2 className="mt-2 text-lg font-black text-white">핵심 설명 연결 대기</h2><p className="mt-4 text-sm leading-6 text-[#819eb6]">Knowledge Runtime 연결 후 검증된 정의 또는 요약이 표시됩니다.</p></article><article className="rounded-2xl border border-[#174a70] bg-[#06182b]/95 p-5 sm:p-6"><TechnicalLabel>KEY POINTS</TechnicalLabel><h2 className="mt-2 text-lg font-black text-white">학습 포인트 준비 상태</h2><ul className="mt-4 space-y-3 text-xs leading-5 text-[#829fb6]"><li className="flex gap-3"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300"/>검증된 핵심 포인트 연결 대기</li><li className="flex gap-3"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300"/>Source 기반 설명 연결 대기</li><li className="flex gap-3"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300"/>학습용 요약 연결 대기</li></ul></article></section>

            <section className="rounded-2xl border border-[#174a70] bg-[#06182b]/95 p-5 sm:p-6"><div className="flex items-start justify-between"><div><TechnicalLabel>RELATED KNOWLEDGE</TechnicalLabel><h2 className="mt-2 text-xl font-black text-white">연관 지식 연결 준비 중</h2></div><Link2 size={26} className="text-[#6298bb]"/></div><div className="mt-5 flex min-h-[128px] items-center justify-center border border-dashed border-[#28516e] bg-[#071b2e]/65 p-5 text-center"><p className="max-w-lg text-sm leading-6 text-[#7895aa]">Canonical Relationship을 제공하는 사용자 Runtime이 연결되기 전에는 연관 개념을 생성하거나 추정하지 않습니다.</p></div></section>
          </div>

          <div className="space-y-4 lg:col-span-4">
            <StatusConsole />
            <section className="rounded-2xl border border-[#174a70] bg-[#06182b]/95 p-5 sm:p-6"><div className="flex items-start justify-between"><div><TechnicalLabel>SOURCE TRACE</TechnicalLabel><h2 className="mt-2 text-xl font-black text-white">검증된 출처 연결 대기</h2></div><Scale size={26} className="text-[#6192b4]"/></div><div className="mt-5 border border-[#173e5c] bg-[#071d32] p-4"><p className="text-xs leading-6 text-[#7f9bb1]">Source information will be provided by verified runtime data.</p></div><p className="mt-4 text-[10px] leading-5 text-[#66859d]">기관명, 문서명, locator, revision과 effective date를 임의로 표시하지 않습니다.</p></section>
            <section className="rounded-2xl border border-[#755326] bg-[linear-gradient(145deg,rgba(48,34,18,.86),rgba(16,24,35,.96))] p-5 sm:p-6"><TechnicalLabel tone="amber">TRAINING ACCESS</TechnicalLabel><h2 className="mt-2 text-xl font-black text-white">기본 문제 훈련</h2><p className="mt-4 text-sm leading-6 text-[#b5a58d]">특정 개념 필터는 아직 지원되지 않습니다. 현재 실제 연결된 기본 5문제 세션으로 이동합니다.</p><Link href="/study" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 border border-amber-400/55 bg-amber-400/[.08] px-4 text-sm font-black text-amber-300 transition hover:bg-amber-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60">기본 문제 훈련으로 이동 <ArrowRight size={16}/></Link></section>
          </div>
        </div>

        <div className="mt-4"><Link href="/theory" className="inline-flex min-h-11 items-center gap-2 border border-[#28577d] bg-[#08213b] px-4 text-xs font-black text-[#83cfff] transition hover:border-cyan-300 hover:bg-[#0b2b4a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"><ArrowLeft size={16}/> Knowledge Center로 돌아가기</Link></div>
      </main>
      <BottomNav />
    </div>
  );
}
