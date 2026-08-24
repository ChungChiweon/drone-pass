import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  CloudSun,
  Gauge,
  GraduationCap,
  History,
  Home,
  Layers3,
  Plane,
  Radar,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset,
} from "lucide-react";
import { BottomNav } from "@/components/boat/BottomNav";

type Mission = {
  number: string;
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
  status: "READY" | "NOT CONNECTED";
  href?: string;
};

const navigation = [
  { href: "/", label: "홈", technical: "COMMAND", icon: Home },
  { href: "/study", label: "문제 학습", technical: "TRAINING", icon: BookOpenCheck },
  { href: "/theory", label: "이론 학습", technical: "THEORY", icon: GraduationCap },
  { href: "/practice", label: "연습 계획", technical: "MISSIONS", icon: Target },
  { href: "/fishing-safety", label: "비행 안전", technical: "SAFETY", icon: ShieldCheck },
  { href: "/sea-info", label: "항공 정보", technical: "FLIGHT INFO", icon: CloudSun },
  { href: "/analysis", label: "학습 분석", technical: "ANALYTICS", icon: BarChart3 },
];

const missions: Mission[] = [
  {
    number: "01",
    label: "QUICK TRAINING",
    title: "기본 문제 훈련",
    description: "Active Pack을 우선 사용하고, 연결할 수 없을 때는 검증된 샘플로 5문제 세션을 시작합니다.",
    icon: Plane,
    status: "READY",
    href: "/study",
  },
  {
    number: "02",
    label: "SUBJECT TRAINING",
    title: "과목별 집중",
    description: "과목 선택과 세션 필터가 현재 Question Runtime에 연결되지 않았습니다.",
    icon: Layers3,
    status: "NOT CONNECTED",
  },
  {
    number: "03",
    label: "MIXED MISSION",
    title: "전체 혼합 훈련",
    description: "Blueprint 기반 혼합 출제 설정은 아직 사용자 세션으로 제공되지 않습니다.",
    icon: Radar,
    status: "NOT CONNECTED",
  },
  {
    number: "04",
    label: "WRONG ANSWER",
    title: "오답 다시 풀기",
    description: "개인별 Attempt 기록의 영속 연결이 완료되면 사용할 수 있습니다.",
    icon: TimerReset,
    status: "NOT CONNECTED",
  },
  {
    number: "05",
    label: "WEAK CONCEPT",
    title: "취약개념 집중",
    description: "Mastery 분석 결과를 학습 세션으로 전달하는 연결을 준비하고 있습니다.",
    icon: BrainCircuit,
    status: "NOT CONNECTED",
  },
  {
    number: "06",
    label: "CUSTOM SESSION",
    title: "맞춤 세션",
    description: "난이도, 문제 수, 제한 시간 설정은 아직 운영 Runtime에 연결되지 않았습니다.",
    icon: Settings2,
    status: "NOT CONNECTED",
  },
];

function TechnicalLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#67dfff]">{children}</span>;
}

function PracticeRail() {
  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-[232px] flex-col border-r border-[#143d60] bg-[linear-gradient(180deg,#071b33,#041326_72%,#061a31)] xl:flex">
      <div className="border-b border-[#143d60] px-7 py-7">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-[#1a699b] bg-[#082c4d] text-[#62e4ff] shadow-[0_0_26px_rgba(46,207,255,0.16)]">
            <Plane size={22} />
          </div>
          <div>
            <p className="text-[18px] font-black tracking-[0.05em] text-white">DRONE PASS</p>
            <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-[#7194b4]">Premium Aviation Training</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-6" aria-label="주요 탐색">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/practice";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-4 rounded-xl border px-4 py-3 transition ${
                active
                  ? "border-[#167fc0] bg-[linear-gradient(90deg,rgba(10,112,206,0.46),rgba(7,44,78,0.56))] text-white shadow-[inset_3px_0_0_#43dcff,0_0_22px_rgba(0,144,255,0.08)]"
                  : "border-transparent text-[#8da9c3] hover:border-[#184a70] hover:bg-[#08213b] hover:text-white"
              }`}
            >
              <Icon size={21} className={active ? "text-[#58ddff]" : "text-[#7198ba] group-hover:text-[#58ddff]"} />
              <span className="min-w-0">
                <span className="block text-[13px] font-bold">{item.label}</span>
                <span className="block text-[8px] font-semibold tracking-[0.15em] text-[#577998]">{item.technical}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="m-4 rounded-2xl border border-[#174d75] bg-[#061a30]/90 p-4 shadow-[inset_0_1px_0_rgba(94,221,255,0.08)]">
        <TechnicalLabel>MISSION STATUS</TechnicalLabel>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-2xl font-black text-white">01</p>
            <p className="text-[10px] text-[#7798b4]">MODE READY</p>
          </div>
          <Activity size={32} className="text-[#46e6a4]" />
        </div>
        <div className="mt-4 h-px bg-[linear-gradient(90deg,#1b8bd0,transparent)]" />
        <p className="mt-3 text-[10px] leading-5 text-[#7899b5]">실제 Runtime에 연결된 훈련만 활성화됩니다.</p>
      </div>
    </aside>
  );
}

function PracticeHeader() {
  return (
    <header className="sticky top-0 z-40 flex min-h-[72px] items-center justify-between border-b border-[#143b5d] bg-[#031124]/94 px-4 backdrop-blur-xl sm:px-7 xl:px-9">
      <div className="min-w-0">
        <TechnicalLabel>TRAINING MISSIONS</TechnicalLabel>
        <h1 className="truncate text-base font-black tracking-[0.06em] text-white sm:text-lg">AVIATION MISSION CONTROL</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden border-r border-[#183c5e] pr-4 text-right sm:block">
          <p className="text-[9px] font-bold tracking-[0.14em] text-[#5f809d]">SYSTEM LINK</p>
          <p className="mt-0.5 text-xs font-bold text-[#56dfa9]">RUNTIME STANDBY</p>
        </div>
        <div className="rounded-lg border border-[#17578a] bg-[#07203a] px-3 py-2 text-right">
          <p className="text-[8px] font-bold tracking-[0.16em] text-[#6386a3]">AVAILABLE</p>
          <p className="text-xs font-black text-[#5fe5ff]">01 READY</p>
        </div>
      </div>
    </header>
  );
}

function MissionCard({ mission }: { mission: Mission }) {
  const Icon = mission.icon;
  const ready = mission.status === "READY";
  const content = (
    <>
      <div className="pointer-events-none absolute right-0 top-0 h-14 w-14 border-r border-t border-[#2f88b9]/35 [clip-path:polygon(34%_0,100%_0,100%_66%)]" />
      <div className="flex items-start justify-between gap-4">
        <div className={`grid h-12 w-12 place-items-center rounded-xl border ${ready ? "border-[#238ccb] bg-[#073966] text-[#64e7ff]" : "border-[#24455f] bg-[#0a2035] text-[#63809b]"}`}>
          <Icon size={23} />
        </div>
        <div className="text-right">
          <p className="font-mono text-2xl font-black text-[#31516b]">{mission.number}</p>
          <span className={`mt-1 inline-flex rounded-full border px-2 py-1 text-[8px] font-black tracking-[0.14em] ${ready ? "border-[#1c8b7b] bg-[#083e3b] text-[#5de4b1]" : "border-[#3b4d5f] bg-[#102132] text-[#7790a5]"}`}>
            {mission.status}
          </span>
        </div>
      </div>
      <p className={`mt-5 text-[10px] font-bold tracking-[0.2em] ${ready ? "text-[#62ddff]" : "text-[#5f7a92]"}`}>{mission.label}</p>
      <h3 className="mt-2 text-xl font-black text-white">{mission.title}</h3>
      <p className="mt-3 min-h-[72px] text-sm font-medium leading-6 text-[#88a4bc]">{mission.description}</p>
      <div className="mt-5 flex items-center justify-between border-t border-[#173d5c] pt-4">
        <span className="text-[9px] font-bold tracking-[0.14em] text-[#55738e]">MISSION {ready ? "AVAILABLE" : "LOCKED"}</span>
        {ready ? <ArrowRight size={18} className="text-[#58e1ff] transition-transform group-hover:translate-x-1" /> : <span className="h-2 w-2 rounded-full bg-[#455b6e]" />}
      </div>
    </>
  );

  const className = `group relative overflow-hidden rounded-2xl border p-5 transition ${
    ready
      ? "border-[#1679b5] bg-[linear-gradient(145deg,rgba(6,49,83,0.96),rgba(4,23,42,0.98))] shadow-[0_18px_50px_rgba(0,109,190,0.13),inset_0_1px_0_rgba(97,225,255,0.12)] hover:-translate-y-0.5 hover:border-[#4ad8ff]"
      : "border-[#173852] bg-[linear-gradient(145deg,rgba(7,29,50,0.93),rgba(4,19,35,0.95))] opacity-80"
  }`;

  return ready && mission.href ? (
    <Link href={mission.href} className={className} aria-label={`${mission.title} 시작`}>
      {content}
    </Link>
  ) : (
    <article className={className} data-disabled="true">
      {content}
    </article>
  );
}

export default function PracticePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#020d1c] text-white [background-image:radial-gradient(circle_at_72%_10%,rgba(0,136,255,0.12),transparent_32%),linear-gradient(rgba(24,86,126,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(24,86,126,0.08)_1px,transparent_1px)] [background-size:auto,48px_48px,48px_48px] xl:pl-[232px]">
      <PracticeRail />
      <PracticeHeader />

      <main className="mx-auto w-full max-w-[1220px] px-4 pb-28 pt-5 sm:px-7 sm:pt-7 xl:px-9 xl:pb-12">
        <section className="relative overflow-hidden rounded-[22px] border border-[#17638f] bg-[linear-gradient(115deg,rgba(5,32,57,0.98),rgba(5,48,81,0.84)_52%,rgba(3,20,38,0.96))] px-5 py-7 shadow-[0_24px_80px_rgba(0,79,143,0.2),inset_0_1px_0_rgba(116,226,255,0.12)] sm:px-8 sm:py-9">
          <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_78%_48%,transparent_0,transparent_68px,rgba(44,203,255,.18)_69px,transparent_70px),radial-gradient(circle_at_78%_48%,transparent_0,transparent_118px,rgba(44,203,255,.1)_119px,transparent_120px)]" />
          <div className="pointer-events-none absolute right-[8%] top-1/2 hidden h-px w-[34%] origin-right -rotate-12 bg-[linear-gradient(90deg,transparent,#33d7ff)] lg:block" />
          <div className="relative z-10 max-w-3xl">
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-full border border-[#2586bd] bg-[#07365c] text-[#62e4ff]"><Radar size={17} /></span>
              <TechnicalLabel>MISSION PLANNING / 01</TechnicalLabel>
            </div>
            <h2 className="mt-5 text-3xl font-black leading-[1.05] tracking-[-0.03em] text-white sm:text-5xl">TRAINING<br /><span className="text-[#66ddff]">MISSION CONTROL</span></h2>
            <p className="mt-5 max-w-2xl text-sm font-medium leading-7 text-[#a7bed1] sm:text-base">실제로 연결된 문제 Runtime을 기준으로 훈련을 시작합니다. 준비되지 않은 기능은 활성화된 것처럼 보이지 않으며, 연결 상태를 명확히 표시합니다.</p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/study" className="inline-flex min-h-12 items-center justify-center gap-3 rounded-lg border border-[#54ddff] bg-[linear-gradient(135deg,#1288ef,#075bc4)] px-5 text-sm font-black text-white shadow-[0_0_24px_rgba(37,178,255,0.26)] transition hover:brightness-110">기본 5문제 훈련 시작 <ArrowRight size={18} /></Link>
              <span className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-[#26506f] bg-[#061a2d]/70 px-4 text-xs font-bold text-[#84a3bd]"><CheckCircle2 size={16} className="text-[#55dfa9]" /> VALIDATED QUESTIONS ONLY</span>
            </div>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-2 overflow-hidden rounded-2xl border border-[#153e5e] bg-[#06172a]/94 sm:grid-cols-4">
          {[
            ["AVAILABLE MISSION", "01", "READY"],
            ["SESSION SIZE", "05", "QUESTIONS"],
            ["RUNTIME PATH", "ACTIVE / FALLBACK", "PACK DELIVERY"],
            ["TRAINING LOG", "NOT CONNECTED", "PERSISTENCE"],
          ].map(([label, value, note], index) => (
            <div key={label} className={`min-h-[92px] p-4 ${index % 2 ? "border-l border-[#153e5e]" : ""} ${index > 1 ? "border-t border-[#153e5e] sm:border-t-0" : ""} ${index === 2 ? "sm:border-l" : ""}`}>
              <p className="text-[8px] font-bold tracking-[0.16em] text-[#5d7e99]">{label}</p>
              <p className={`mt-2 font-black ${value.length > 8 ? "text-xs sm:text-sm" : "text-xl"} ${index === 0 ? "text-[#59e1ad]" : "text-white"}`}>{value}</p>
              <p className="mt-1 text-[8px] font-semibold tracking-[0.12em] text-[#54728b]">{note}</p>
            </div>
          ))}
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div><TechnicalLabel>MISSION CATALOG</TechnicalLabel><h2 className="mt-2 text-2xl font-black text-white">훈련 모드</h2></div>
            <p className="hidden text-right text-xs leading-5 text-[#6888a2] sm:block">Runtime 연결 상태를 기준으로<br />사용 가능 여부를 표시합니다.</p>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {missions.map((mission) => <MissionCard key={mission.number} mission={mission} />)}
          </div>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
          <article className="rounded-2xl border border-[#174a70] bg-[#06182b]/95 p-5 shadow-[inset_0_1px_0_rgba(90,214,255,0.08)] sm:p-6">
            <div className="flex items-center justify-between gap-4"><div><TechnicalLabel>SESSION CONFIGURATION</TechnicalLabel><h2 className="mt-2 text-xl font-black">현재 훈련 설정</h2></div><Gauge className="text-[#59dcff]" size={28} /></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                ["DELIVERY", "Active Pack 우선", "미연결 시 sample fallback"],
                ["QUESTION COUNT", "5문제", "현재 /study 고정 세션"],
                ["SELECTION", "Compiler + Validator", "검증 통과 문항만 전달"],
              ].map(([label, value, note]) => (
                <div key={label} className="rounded-xl border border-[#163e5d] bg-[#071e35] p-4"><p className="text-[8px] font-bold tracking-[0.16em] text-[#5c7f9b]">{label}</p><p className="mt-3 text-sm font-black text-white">{value}</p><p className="mt-2 text-[11px] leading-5 text-[#7695ae]">{note}</p></div>
              ))}
            </div>
            <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-[#6789a4]"><ClipboardCheck size={15} className="mt-0.5 shrink-0 text-[#4acbea]" />현재 Runtime이 지원하지 않는 난이도·과목·시간 설정은 조작 가능한 컨트롤로 제공하지 않습니다.</p>
          </article>

          <article className="rounded-2xl border border-[#775526] bg-[linear-gradient(145deg,rgba(49,35,20,.86),rgba(17,25,36,.96))] p-5 sm:p-6">
            <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold tracking-[0.18em] text-[#f0b64f]">NEXT TRAINING</p><h2 className="mt-2 text-xl font-black">추천 연결 대기</h2></div><Sparkles size={26} className="text-[#f4b942]" /></div>
            <p className="mt-5 text-sm leading-6 text-[#b8aa93]">Mastery와 최근 학습 기록이 아직 사용자 세션에 연결되지 않아 개인화 추천을 만들지 않습니다.</p>
            <Link href="/study" className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#ffc65d] hover:text-[#ffda91]">기본 훈련으로 이동 <ArrowRight size={16} /></Link>
          </article>
        </section>

        <section className="mt-4 rounded-2xl border border-[#153e5e] bg-[#05172a]/94 p-5 sm:p-6">
          <div className="flex flex-col items-center justify-center py-7 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full border border-[#245777] bg-[#082139] text-[#7196b5]"><History size={26} /></div>
            <TechnicalLabel>TRAINING LOG</TechnicalLabel>
            <h2 className="mt-2 text-lg font-black">완료된 훈련 기록이 없습니다</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#7693ab]">Attempt 저장과 학습 이력 연결이 준비되면 최근 세션과 성과 변화가 이곳에 표시됩니다.</p>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
