"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BookOpenCheck, Building2, CloudSun, Cpu, GraduationCap, HelpCircle, Plane, Radar, ShieldCheck, Sparkles } from "lucide-react";

type HomeSection = {
  order: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  status: "ready" | "soon";
  highlights: string[];
};

const sections: HomeSection[] = [
  { order: "01", title: "드론 자격시험 학습센터", description: "문제은행은 준비중이며 학습 구조와 오답/분석 흐름을 드론 자격시험에 맞게 전환 중입니다.", href: "/study", icon: GraduationCap, status: "soon", highlights: ["초경량비행장치", "필기 학습", "모의고사"] },
  { order: "02", title: "비행 안전 가이드", description: "비행 전 점검, 현장 통제, 배터리 관리, 비상 대응을 초보자 관점에서 정리했습니다.", href: "/fishing-safety", icon: ShieldCheck, status: "ready", highlights: ["체크리스트", "기상 판단", "비상 대응"] },
  { order: "03", title: "드론 비행정보", description: "풍속, 강풍, 강수, 시정 등 비행 가능 조건을 확인하는 정보 허브로 전환 예정입니다.", href: "/sea-info", icon: CloudSun, status: "soon", highlights: ["비행 날씨", "시정", "강수"] },
  { order: "04", title: "드론 교육장/시험장", description: "검증된 교육장과 시험장 정보를 연결하기 위한 placeholder 페이지입니다.", href: "/centers", icon: Building2, status: "soon", highlights: ["교육원", "시험장", "지역 검색"] },
  { order: "05", title: "드론 용어사전", description: "자격시험과 안전 비행에서 자주 만나는 핵심 용어 50개를 먼저 제공합니다.", href: "/dictionary", icon: BookOpenCheck, status: "ready", highlights: ["50개 샘플", "검색", "카테고리"] },
  { order: "06", title: "드론 기체백과", description: "멀티콥터, 고정익, VTOL 등 기체 유형을 정리하는 백과 페이지로 확장합니다.", href: "/boatpedia", icon: Plane, status: "soon", highlights: ["기체 유형", "운용 특성", "주의사항"] },
  { order: "07", title: "드론 장비백과", description: "배터리, 조종기, 프로펠러, 짐벌, 충전 장비 등 운용 장비 정보를 준비합니다.", href: "/boatpedia", icon: Cpu, status: "soon", highlights: ["배터리", "조종기", "센서"] },
  { order: "08", title: "드론 상식센터", description: "초보 조종자가 자주 묻는 준비, 안전, 학습 질문을 FAQ 형태로 정리했습니다.", href: "/faq", icon: HelpCircle, status: "ready", highlights: ["30개 FAQ", "입문", "학습"] },
  { order: "09", title: "준비중 기능", description: "실시간 공역/지도/API 연동, 커뮤니티, AI 코치 기능은 검증 후 순차 적용합니다.", href: "/coming-soon?section=Drone%20Pass&feature=portal", icon: Sparkles, status: "soon", highlights: ["공역", "지도", "AI 코치"] }
];

function StatusBadge({ status }: { status: HomeSection["status"] }) {
  return status === "ready" ? (
    <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-black text-emerald-700">1차 제공</span>
  ) : (
    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-500">준비중</span>
  );
}

function SectionCard({ item }: { item: HomeSection }) {
  const Icon = item.icon;

  return (
    <Link href={item.href} className="group flex min-h-[168px] flex-col rounded-[1.25rem] border border-cyan-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
            <Icon size={22} />
          </div>
          <span className="text-xs font-black text-slate-400">{item.order}</span>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <h2 className="mt-3 text-lg font-black text-slate-950">{item.title}</h2>
      <p className="mt-1.5 text-sm font-semibold leading-6 text-slate-500">{item.description}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {item.highlights.map((highlight) => (
          <span key={`${item.title}-${highlight}`} className="rounded-full bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-600">
            {highlight}
          </span>
        ))}
      </div>
      <span className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-black text-cyan-700">
        열기 <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

export function HomeLanding() {
  return (
    <div className="max-w-full overflow-x-hidden space-y-6 lg:space-y-8">
      <section className="relative max-w-full overflow-hidden rounded-[2rem] border border-cyan-100 bg-white shadow-xl shadow-cyan-200/30">
        <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(236,254,255,0.96)_0%,rgba(224,242,254,0.86)_46%,rgba(14,165,233,0.22)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(135deg,#0891b2_0%,#0369a1_52%,#0B2545_100%)] opacity-90" />

        <div className="relative grid w-full gap-6 p-5 sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:p-10">
          <div className="min-w-0">
            <p className="text-sm font-black text-cyan-700">대한민국 드론 자격시험 · 드론 안전 · 비행정보 플랫폼</p>
            <h1 className="mt-3 break-words text-4xl font-black leading-none text-[#0B2545] sm:text-6xl lg:text-7xl">Drone Pass</h1>
            <p className="mt-3 max-w-full break-words text-xl font-black leading-snug text-cyan-700 sm:text-3xl">하늘로 가는 가장 쉬운 길</p>
            <p className="mt-4 max-w-2xl break-words text-sm font-bold leading-7 text-slate-700 sm:text-base">
              자격시험부터 비행 안전, 기체 지식, 교육장 정보까지 한 곳에서. 드론패스는 검증 가능한 정보와 학습 흐름을 차근차근 쌓아가는 드론 포털입니다.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link href="/study" className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-700 px-5 py-4 text-sm font-black text-white shadow-lg shadow-cyan-700/25 transition hover:bg-cyan-800">
                <GraduationCap size={20} />
                드론 자격시험 학습
              </Link>
              <Link href="/fishing-safety" className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#0B2545] px-5 py-4 text-sm font-black text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-950">
                <ShieldCheck size={20} />
                비행 안전 가이드
              </Link>
            </div>
          </div>

          <div className="w-full min-w-0 rounded-[1.75rem] bg-[#0B2545] p-5 text-white shadow-xl">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs font-black text-cyan-100">문제은행</p>
                <p className="mt-2 text-xl font-black sm:text-2xl">준비중</p>
                <p className="mt-1 text-xs font-bold text-cyan-100">해양 문항 미노출</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs font-black text-cyan-100">용어사전</p>
                <p className="mt-2 text-xl font-black sm:text-2xl">50개</p>
                <p className="mt-1 text-xs font-bold text-cyan-100">드론 샘플 데이터</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs font-black text-cyan-100">FAQ</p>
                <p className="mt-2 text-xl font-black sm:text-2xl">30개</p>
                <p className="mt-1 text-xs font-bold text-cyan-100">입문 질문 중심</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-xs font-black text-cyan-100">비행정보</p>
                <p className="mt-2 text-xl font-black sm:text-2xl">검증 예정</p>
                <p className="mt-1 text-xs font-bold text-cyan-100">법령/공역 단정 금지</p>
              </div>
            </div>
            <p className="mt-4 text-sm font-semibold leading-6 text-cyan-50">
              실제 시험 기준, 수수료, 공역, 비행금지구역 정보는 공식 출처 확인 후 반영합니다.
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-cyan-700">Drone Portal IA</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">드론패스 홈 구조</h2>
          </div>
          <Radar className="hidden text-cyan-700 sm:block" size={24} />
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sections.map((section) => (
            <SectionCard key={section.title} item={section} />
          ))}
        </div>
      </section>
    </div>
  );
}
