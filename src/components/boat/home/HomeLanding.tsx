import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity, ArrowRight, BarChart3, Bell, BookOpenCheck, ChevronRight,
  CircleAlert, ClipboardCheck, CloudSun, Crosshair, Gauge, GraduationCap,
  History, Home, Menu, Plane, Radar, Route, Satellite, Scale, ShieldCheck,
  Sparkles,
} from "lucide-react";
import { BottomNav } from "@/components/boat/BottomNav";

type NavItem = { label: string; english: string; href: string; icon: LucideIcon };
type DomainStatus = { name: string; english: string; status: string; detail: string; icon: LucideIcon; tone: "cyan" | "blue" | "amber" };

const navigation: NavItem[] = [
  { label: "홈", english: "COMMAND", href: "/", icon: Home },
  { label: "문제 학습", english: "STUDY", href: "/study", icon: GraduationCap },
  { label: "이론 학습", english: "THEORY", href: "/theory", icon: BookOpenCheck },
  { label: "비행 안전", english: "SAFETY", href: "/fishing-safety", icon: ShieldCheck },
  { label: "항공 정보", english: "FLIGHT INFO", href: "/sea-info", icon: CloudSun },
  { label: "학습 현황", english: "PROGRESS", href: "/progress", icon: BarChart3 },
  { label: "드론 용어", english: "DICTIONARY", href: "/dictionary", icon: ClipboardCheck },
];

const domains: DomainStatus[] = [
  { name: "법규", english: "LEGAL KNOWLEDGE", status: "READY WITH GAPS", detail: "검증 산출물 존재 · 통합 Runtime 연결 전", icon: Scale, tone: "blue" },
  { name: "기상", english: "WEATHER INTELLIGENCE", status: "SHADOW READY", detail: "Shadow 검증 완료 · Active 전환 대기", icon: CloudSun, tone: "cyan" },
  { name: "비행이론", english: "FLIGHT THEORY", status: "REVIEW REQUIRED", detail: "Integration Audit 완료 · Canonical 검토 필요", icon: Plane, tone: "amber" },
];

function Label({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "cyan" | "amber" }) {
  const color = tone === "cyan" ? "text-[#65dcff]" : tone === "amber" ? "text-[#f1b84b]" : "text-[#7894b2]";
  return <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${color}`}>{children}</p>;
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`relative overflow-hidden border border-[#154a73] bg-[linear-gradient(145deg,rgba(8,31,56,.96),rgba(4,19,38,.96))] shadow-[inset_0_1px_0_rgba(127,216,255,.05),0_22px_60px_rgba(0,5,18,.28)] ${className}`}>{children}</section>;
}

function StatusBadge({ children, tone = "cyan" }: { children: React.ReactNode; tone?: "cyan" | "green" | "amber" }) {
  const style = tone === "green" ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-300" : tone === "amber" ? "border-amber-400/35 bg-amber-400/10 text-amber-300" : "border-cyan-300/35 bg-cyan-300/10 text-cyan-200";
  return <span className={`inline-flex items-center gap-2 rounded-sm border px-2.5 py-1 text-[9px] font-black tracking-[.12em] ${style}`}><span className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_9px_currentColor]" />{children}</span>;
}

function CommandSidebar() {
  return <aside className="fixed inset-y-0 left-0 z-50 hidden w-[232px] flex-col border-r border-[#143d60] bg-[linear-gradient(180deg,#071b33,#041326_72%,#061a31)] xl:flex">
    <Link href="/" className="flex h-[94px] items-center gap-3 border-b border-[#143652] px-6 !text-white hover:opacity-100"><div className="relative flex h-11 w-11 items-center justify-center text-[#81dcff]"><Plane size={34} strokeWidth={1.35} /><span className="absolute inset-0 rounded-full border border-cyan-300/20 shadow-[0_0_24px_rgba(66,205,255,.16)]" /></div><div><p className="text-lg font-black tracking-[.03em]">DRONE PASS</p><p className="text-[8px] font-bold tracking-[.17em] text-[#7898b6]">AVIATION INTELLIGENCE</p></div></Link>
    <nav className="flex-1 py-6">{navigation.map((item, index) => { const Icon = item.icon; const active = index === 0; return <Link key={item.href} href={item.href} className={`group relative flex min-h-[62px] items-center gap-4 border-l-2 px-7 transition hover:bg-[#0c3159] hover:opacity-100 ${active ? "border-[#35d6ff] bg-[linear-gradient(90deg,rgba(18,105,194,.58),rgba(15,63,109,.38))] !text-white shadow-[inset_18px_0_35px_rgba(0,156,255,.1)]" : "border-transparent !text-[#aac0d4]"}`}><Icon size={21} className={active ? "text-[#67dcff]" : "text-[#7694b1] group-hover:text-[#67dcff]"} strokeWidth={1.7} /><div><p className="text-sm font-extrabold">{item.label}</p><p className="mt-0.5 text-[8px] font-bold tracking-[.15em] text-[#4f7090]">{item.english}</p></div></Link>; })}</nav>
    <div className="m-4 border border-[#19496f] bg-[#071d36] p-4"><Label>Current license</Label><p className="mt-3 text-sm font-extrabold leading-6 text-white">초경량비행장치<br />조종자</p><div className="my-4 h-px bg-[#153d60]" /><div className="flex items-end justify-between"><div><Label>Target</Label><p className="mt-2 text-2xl font-black text-[#7dbdff]">1종</p></div><Crosshair size={32} className="text-[#2f6693]" strokeWidth={1.2} /></div></div>
  </aside>;
}

function CommandHeader() {
  return <header className="sticky top-0 z-40 flex h-[72px] items-center justify-between border-b border-[#123b5e] bg-[#031124]/92 px-4 backdrop-blur-xl sm:px-6 xl:px-8">
    <div className="flex min-w-0 items-center gap-3"><button type="button" aria-label="메뉴" className="flex h-10 w-10 items-center justify-center border border-[#285477] bg-[#09223d] text-[#9bcce9] xl:hidden"><Menu size={20} /></button><div><Label tone="cyan">Flight training command center</Label><p className="mt-1 truncate text-[11px] font-semibold text-[#8ca8bf] sm:text-xs">체계적인 학습으로 조종자의 자격을 완성하세요</p></div></div>
    <div className="flex items-center gap-2 sm:gap-4"><div className="hidden border border-[#174568] bg-[#061a31] px-4 py-2 sm:block"><Label>System status</Label><div className="mt-1 flex items-center gap-2 text-[11px] font-extrabold text-white">KNOWLEDGE PATH <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" /><span className="text-amber-300">PARTIAL</span></div></div><button type="button" aria-label="알림" className="relative flex h-10 w-10 items-center justify-center border border-[#214c70] bg-[#071c34] text-[#a8c5dc]"><Bell size={18} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-amber-400" /></button><div className="hidden items-center gap-3 border-l border-[#173754] pl-4 md:flex"><div className="text-right"><p className="text-xs font-extrabold text-white">Pilot</p><p className="text-[9px] text-[#6f8da8]">LEARNER MODE</p></div><div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#2b5d83] bg-[#0b2a49] text-[#8bcfff]"><Plane size={18} /></div></div></div>
  </header>;
}

function HeroStage() {
  return <section className="relative min-h-[500px] overflow-hidden rounded-[10px] border border-[#17618f] bg-[#06182b] shadow-[0_28px_90px_rgba(0,7,22,.48)] lg:min-h-[520px]">
    <div className="absolute inset-0 bg-[url('/images/home/drone-command-hero.png')] bg-cover bg-[position:84%_center] sm:bg-[position:64%_center] lg:bg-center" aria-hidden="true" />
    <video
      className="absolute inset-0 h-full w-full object-cover [object-position:84%_center] motion-reduce:hidden sm:[object-position:64%_center] lg:object-center"
      poster="/images/home/drone-command-hero.png"
      autoPlay
      muted
      playsInline
      loop
      preload="metadata"
      aria-label="Drone Pass hero background video"
    >
      <source src="/videos/home/drone-command-loop-seamless.mp4" type="video/mp4" />
    </video>
    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,13,29,.96)_0%,rgba(3,19,38,.78)_42%,rgba(4,19,36,.22)_70%,rgba(2,12,26,.38)_100%)]" />
    <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(67,192,255,.13)_1px,transparent_1px),linear-gradient(90deg,rgba(67,192,255,.13)_1px,transparent_1px)] [background-size:46px_46px] [mask-image:linear-gradient(to_bottom,transparent,black_22%,black_88%)]" />
    <div className="absolute -right-20 top-[-88px] h-[560px] w-[560px] rounded-full border border-cyan-300/25 shadow-[inset_0_0_90px_rgba(36,189,255,.08),0_0_80px_rgba(28,141,219,.08)]"><div className="absolute inset-[11%] rounded-full border border-cyan-300/18" /><div className="absolute inset-[24%] rounded-full border border-cyan-300/24" /><div className="absolute left-1/2 top-0 h-full w-px bg-cyan-300/14" /><div className="absolute left-0 top-1/2 h-px w-full bg-cyan-300/14" /><div className="absolute left-1/2 top-1/2 h-px w-[48%] origin-left -rotate-[32deg] bg-gradient-to-r from-cyan-300/75 to-transparent" /><span className="absolute left-[67%] top-[33%] h-2.5 w-2.5 rounded-full border-2 border-cyan-100 bg-cyan-400 shadow-[0_0_16px_#22d3ee]" /><span className="absolute left-[35%] top-[69%] h-2 w-2 rounded-full border border-cyan-100 bg-[#0b72db] shadow-[0_0_14px_#22d3ee]" /></div>
    <svg className="absolute bottom-0 right-0 h-[46%] w-[70%] opacity-80" viewBox="0 0 760 270" fill="none" aria-hidden="true"><path d="M10 244C116 209 161 238 253 177s137-5 226-83S625 91 750 18" stroke="#27CFFF" strokeWidth="1.5"/><path d="M10 244C116 209 161 238 253 177s137-5 226-83S625 91 750 18" stroke="#147BFF" strokeWidth="12" opacity=".12"/>{[[253,177],[479,94],[630,76]].map(([x,y])=><g key={`${x}-${y}`}><circle cx={x} cy={y} r="5" fill="#06182b" stroke="#66E7FF" strokeWidth="2"/><circle cx={x} cy={y} r="13" stroke="#66E7FF" opacity=".25"/></g>)}</svg>
    <div className="relative z-10 flex min-h-[500px] flex-col justify-between p-5 sm:p-8 lg:min-h-[520px] lg:p-10"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Radar size={15} className="text-cyan-300"/><Label tone="cyan">Mission control / certification route</Label></div><StatusBadge tone="amber">RUNTIME PARTIAL</StatusBadge></div><div className="max-w-[620px] py-12 lg:py-8"><p className="text-[11px] font-black tracking-[.3em] text-[#75beff]">DRONE PASS · READY FOR FLIGHT</p><h1 className="mt-4 text-[40px] font-black leading-[.98] tracking-[-.045em] text-white sm:text-[58px] lg:text-[68px]">PREMIUM<br/><span className="bg-gradient-to-r from-[#47c7ff] via-[#a8e8ff] to-[#67baff] bg-clip-text text-transparent">AVIATION</span><br/>INTELLIGENCE</h1><p className="mt-5 max-w-[520px] text-sm font-semibold leading-7 text-[#b9cedf] sm:text-base">법규, 기상, 비행이론 기반 학습과 문제 훈련을 하나의 정밀한 드론 자격 학습 환경에서 연결합니다.</p><div className="mt-7 flex flex-col gap-3 min-[430px]:flex-row"><Link href="/study" className="inline-flex min-h-12 items-center justify-center gap-3 rounded-sm border border-[#4edcff] bg-[linear-gradient(135deg,#1487ef,#075bc4)] px-7 text-sm font-black !text-white shadow-[0_0_30px_rgba(25,160,255,.3)] transition hover:brightness-110 hover:opacity-100">학습 시작 <ArrowRight size={17}/></Link><Link href="/theory" className="inline-flex min-h-12 items-center justify-center gap-3 rounded-sm border border-[#3978a5] bg-[#071b32]/80 px-7 text-sm font-black !text-[#d9efff] backdrop-blur transition hover:border-cyan-300 hover:bg-[#0b2948] hover:opacity-100">이론 보기 <BookOpenCheck size={17}/></Link></div></div><div className="grid gap-3 border-t border-cyan-200/15 pt-4 sm:grid-cols-[1fr_auto] sm:items-end"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-300/35 bg-cyan-300/10 text-cyan-200"><Gauge size={19}/></div><div><Label>Overall readiness</Label><p className="mt-1 text-sm font-extrabold text-white">학습 데이터 연결 대기</p></div></div><p className="flex items-center gap-2 text-[9px] font-bold tracking-[.13em] text-[#7190ab]"><Activity size={13}/> VIDEO STAGE / POSTER FALLBACK READY</p></div></div>
    <div className="absolute bottom-24 right-5 hidden w-[154px] border border-cyan-300/25 bg-[#031426]/65 backdrop-blur-md md:block"><div className="flex items-center gap-3 border-b border-cyan-300/15 p-3"><Radar size={18} className="text-cyan-300"/><div><Label>Navigation</Label><p className="mt-1 text-xs font-black text-white">ROUTE READY</p></div></div><div className="flex items-center gap-3 p-3"><Satellite size={18} className="text-[#72b8ff]"/><div><Label>Signal</Label><p className="mt-1 text-xs font-black text-white">DATA PENDING</p></div></div></div>
  </section>;
}

function MissionStrip() {
  const cards = [{ label: "Today mission", value: "학습 준비", note: "문제 학습 사용 가능", icon: Route, tone: "cyan" },{ label: "Current module", value: "—", note: "학습 시작 후 표시", icon: BookOpenCheck, tone: "blue" },{ label: "Attention required", value: "—", note: "분석할 기록 없음", icon: CircleAlert, tone: "amber" },{ label: "Last session", value: "—", note: "최근 학습 없음", icon: History, tone: "blue" }];
  return <div className="grid border border-[#17466d] bg-[#06192f] sm:grid-cols-2 lg:grid-cols-4">{cards.map((card,index)=>{const Icon=card.icon; return <div key={card.label} className={`relative flex min-h-[104px] items-center justify-between gap-3 p-5 ${index ? "border-t border-[#143b5c] sm:border-l sm:border-t-0" : ""} ${card.tone === "amber" ? "bg-[linear-gradient(135deg,rgba(89,54,13,.28),transparent)]" : ""}`}><div><Label tone={card.tone === "amber" ? "amber" : card.tone === "cyan" ? "cyan" : "muted"}>{card.label}</Label><p className={`mt-2 text-base font-extrabold ${card.tone === "amber" ? "text-amber-300" : "text-white"}`}>{card.value}</p><p className="mt-1 text-[10px] font-medium text-[#718da5]">{card.note}</p></div><Icon size={31} strokeWidth={1.25} className={card.tone === "amber" ? "text-amber-400" : card.tone === "cyan" ? "text-cyan-300" : "text-[#557894]"}/></div>})}</div>;
}

function DomainRow({ domain }: { domain: DomainStatus }) {
  const Icon=domain.icon; const tone=domain.tone === "amber" ? "border-amber-400/30 bg-amber-400/10 text-amber-300" : domain.tone === "cyan" ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-200" : "border-blue-400/30 bg-blue-400/10 text-blue-300";
  return <div className="grid gap-3 border border-[#153b5b] bg-[#071b31] p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center"><div className={`flex h-11 w-11 items-center justify-center border ${tone}`}><Icon size={21}/></div><div><p className="text-sm font-extrabold text-white">{domain.name}</p><p className="mt-0.5 text-[8px] font-bold tracking-[.13em] text-[#577794]">{domain.english}</p><p className="mt-1 text-[10px] text-[#7d98af]">{domain.detail}</p></div><span className={`w-fit border px-2 py-1 text-[8px] font-black tracking-[.08em] ${tone}`}>{domain.status}</span></div>;
}

function DashboardContent() {
  return <main className="relative mx-auto w-full max-w-[1510px] space-y-3 px-3 pb-24 pt-3 sm:px-5 sm:pt-5 xl:px-6 xl:pb-8"><HeroStage/><MissionStrip/><div className="grid gap-3 lg:grid-cols-12">
    <Panel className="p-5 lg:col-span-4"><div className="flex items-start justify-between"><div><Label tone="cyan">Continue training</Label><h2 className="mt-1 text-lg font-black text-white">첫 비행 훈련</h2></div><Crosshair className="text-[#70b9ee]"/></div><div className="mt-5 flex min-h-[246px] flex-col items-center justify-center border border-[#173c5d] bg-[#081e36] p-5 text-center"><Plane size={37} strokeWidth={1.2} className="text-[#76baff]"/><p className="mt-5 text-sm font-bold text-[#c3d5e4]">학습 기록이 없습니다</p><p className="mt-2 text-xs leading-5 text-[#7690a6]">진도 추적 데이터가 연결되면<br/>이어학습 경로가 표시됩니다.</p><Link href="/study" className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm bg-[#0d6ed5] text-sm font-black !text-white hover:bg-[#1788ef] hover:opacity-100">첫 학습 시작 <ArrowRight size={15}/></Link></div></Panel>
    <Panel className="p-5 lg:col-span-5"><div className="flex items-start justify-between"><div><Label tone="cyan">Subject system status</Label><h2 className="mt-1 text-lg font-black text-white">지식 시스템 현황</h2></div><StatusBadge>SHADOW / REVIEW</StatusBadge></div><div className="mt-5 space-y-2">{domains.map(domain=><DomainRow key={domain.name} domain={domain}/>)}</div></Panel>
    <Panel className="border-[#6c4b1e] bg-[linear-gradient(145deg,rgba(46,31,13,.95),rgba(16,18,24,.96))] p-5 lg:col-span-3"><div className="flex items-start justify-between"><div><Label tone="amber">Attention required</Label><h2 className="mt-1 text-lg font-black text-[#f0c67b]">집중 학습 영역</h2></div><CircleAlert className="text-amber-400"/></div><div className="mt-5 flex min-h-[246px] flex-col items-center justify-center border border-amber-500/35 bg-amber-500/[.06] p-5 text-center"><Radar size={39} className="text-amber-400" strokeWidth={1.2}/><p className="mt-5 text-sm font-extrabold text-amber-300">아직 분석할 데이터가 없습니다</p><p className="mt-2 text-xs leading-5 text-[#b59b73]">문제 풀이 기록이 쌓이면 취약 지식과 복습 우선순위를 안내합니다.</p><Link href="/study" className="mt-6 inline-flex min-h-10 items-center justify-center gap-2 border border-amber-400/60 px-4 text-xs font-black !text-amber-300 hover:bg-amber-400/10 hover:opacity-100">문제풀이 시작 <ArrowRight size={14}/></Link></div></Panel>
  </div><Panel className="p-5"><div className="flex items-end justify-between"><div><Label tone="cyan">Quick access</Label><h2 className="mt-1 text-lg font-black text-white">학습 관제 메뉴</h2></div><span className="hidden text-[9px] font-bold tracking-[.15em] text-[#486b89] sm:block">MISSION ACCESS 01—06</span></div><div className="mt-5 grid gap-2 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">{navigation.slice(1).map((item,index)=>{const Icon=item.icon;return <Link key={item.href} href={item.href} className="group flex min-h-[112px] flex-col justify-between border border-[#174364] bg-[#081f38] p-4 transition hover:-translate-y-0.5 hover:border-cyan-300/60 hover:bg-[#0b2b4b] hover:opacity-100"><div className="flex items-start justify-between"><div className="flex h-10 w-10 items-center justify-center border border-[#28668f] bg-[#0b3155] text-[#80c7ff]"><Icon size={20}/></div><span className="text-[9px] font-bold text-[#365e7d]">0{index+1}</span></div><div className="mt-4 flex items-end justify-between"><div><p className="text-sm font-extrabold text-white">{item.label}</p><p className="mt-1 text-[8px] font-bold tracking-[.12em] text-[#587895]">{item.english}</p></div><ChevronRight size={15} className="text-[#347db1] group-hover:text-cyan-300"/></div></Link>})}</div></Panel><section className="flex flex-col gap-4 border border-[#153f62] bg-[#06182d] p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#2b628d] bg-[#0a2b4a] text-[#79c9ff]"><Sparkles size={18}/></div><div><Label>Drone pass intelligence</Label><p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-[#94aec3]">드론 자격시험 학습, 안전 지식, 체계적인 문제 훈련을 하나의 검증 가능한 학습 경로로 연결합니다.</p></div></div><p className="flex items-center gap-2 text-[9px] font-bold tracking-[.12em] text-[#5d7d99]"><Satellite size={14}/> ACTIVE DATA CONNECTION PENDING</p></section></main>;
}

export function HomeLanding() {
  return <div className="min-h-screen overflow-x-hidden bg-[#020d1c] text-white [background-image:radial-gradient(circle_at_72%_8%,rgba(17,92,154,.18),transparent_31%),linear-gradient(rgba(15,61,96,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(15,61,96,.07)_1px,transparent_1px)] [background-size:auto,48px_48px,48px_48px] xl:pl-[232px]"><CommandSidebar/><div className="min-w-0"><CommandHeader/><DashboardContent/></div><BottomNav/></div>;
}
