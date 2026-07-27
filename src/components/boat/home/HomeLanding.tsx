"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpenCheck,
  Building2,
  ChevronDown,
  CloudSun,
  Cpu,
  GraduationCap,
  HelpCircle,
  Plane,
  ShieldCheck,
  Sparkles
} from "lucide-react";

type HomeSection = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  status: "ready" | "soon";
  highlights: string[];
};

type SectionGroup = {
  title: string;
  summary: string;
  items: HomeSection[];
};

const groups: SectionGroup[] = [
  {
    title: "시험 준비",
    summary: "자격시험 학습, 문제 생성, 용어 정리를 묶었습니다.",
    items: [
      {
        title: "드론 자격시험 학습센터",
        description: "문제은행은 준비중이며 학습 구조와 오답 분석 흐름을 드론 자격시험에 맞게 전환 중입니다.",
        href: "/study",
        icon: GraduationCap,
        status: "soon",
        highlights: ["초경량비행장치", "필기 학습", "모의고사"]
      },
      {
        title: "드론 용어사전",
        description: "자격시험과 안전 비행에서 자주 만나는 핵심 용어 50개 샘플을 제공합니다.",
        href: "/dictionary",
        icon: BookOpenCheck,
        status: "ready",
        highlights: ["50개 샘플", "검색", "카테고리"]
      },
      {
        title: "드론 상식센터",
        description: "초보 조종자가 자주 묻는 준비, 안전, 학습 질문을 FAQ 형태로 정리했습니다.",
        href: "/faq",
        icon: HelpCircle,
        status: "ready",
        highlights: ["30개 FAQ", "입문", "학습"]
      }
    ]
  },
  {
    title: "비행 안전",
    summary: "현장 점검, 비행 조건, 교육장 정보를 빠르게 확인합니다.",
    items: [
      {
        title: "비행 안전 가이드",
        description: "비행 전 점검, 현장 통제, 배터리 관리, 비상 대응을 초보자 관점에서 정리했습니다.",
        href: "/fishing-safety",
        icon: ShieldCheck,
        status: "ready",
        highlights: ["체크리스트", "기상 판단", "비상 대응"]
      },
      {
        title: "드론 비행정보",
        description: "풍속, 강풍, 강수, 시정 등 비행 가능 조건을 확인하는 정보 허브로 전환 예정입니다.",
        href: "/sea-info",
        icon: CloudSun,
        status: "soon",
        highlights: ["비행 날씨", "시정", "강수"]
      },
      {
        title: "드론 교육장/시험장",
        description: "검증된 교육장과 시험장 정보를 연결하기 위한 placeholder 페이지입니다.",
        href: "/centers",
        icon: Building2,
        status: "soon",
        highlights: ["교육원", "시험장", "지역 검색"]
      }
    ]
  },
  {
    title: "기체와 확장",
    summary: "기체, 장비, 향후 포털 기능을 따로 모았습니다.",
    items: [
      {
        title: "드론 기체백과",
        description: "멀티콥터, 고정익, VTOL 등 기체 유형을 정리하는 백과 페이지로 확장합니다.",
        href: "/boatpedia",
        icon: Plane,
        status: "soon",
        highlights: ["기체 유형", "운용 특성", "주의사항"]
      },
      {
        title: "드론 장비백과",
        description: "배터리, 조종기, 프로펠러, 짐벌, 충전 장비 등 운용 장비 정보를 준비합니다.",
        href: "/boatpedia",
        icon: Cpu,
        status: "soon",
        highlights: ["배터리", "조종기", "센서"]
      },
      {
        title: "준비중 기능",
        description: "실시간 공역/지도 API 연동, 커뮤니티, AI 코치 기능은 검증 후 단계적으로 적용합니다.",
        href: "/coming-soon?section=Drone%20Pass&feature=portal",
        icon: Sparkles,
        status: "soon",
        highlights: ["공역", "지도", "AI 코치"]
      }
    ]
  }
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
    <Link
      href={item.href}
      className="group flex min-h-[136px] flex-col rounded-xl border border-sky-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
            <Icon size={21} />
          </div>
          <h3 className="text-base font-black text-slate-950">{item.title}</h3>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{item.description}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {item.highlights.map((highlight) => (
          <span key={`${item.title}-${highlight}`} className="rounded-full bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-600">
            {highlight}
          </span>
        ))}
      </div>
      <span className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-black text-sky-700">
        열기 <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function FeatureGroup({ group, defaultOpen = false }: { group: SectionGroup; defaultOpen?: boolean }) {
  return (
    <details className="group rounded-xl border border-sky-100 bg-white shadow-sm" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4">
        <div className="min-w-0">
          <h2 className="text-base font-black text-slate-950">{group.title}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-600">{group.summary}</p>
        </div>
        <ChevronDown className="shrink-0 text-sky-700 transition group-open:rotate-180" size={20} />
      </summary>
      <div className="grid gap-3 border-t border-sky-100 p-3 md:grid-cols-2 xl:grid-cols-3">
        {group.items.map((item) => (
          <SectionCard key={item.title} item={item} />
        ))}
      </div>
    </details>
  );
}

export function HomeLanding() {
  return (
    <div className="max-w-full space-y-5 overflow-x-hidden lg:space-y-6">
      <section className="rounded-2xl border border-sky-100 bg-white p-5 shadow-lg shadow-sky-200/30 sm:p-7">
        <p className="text-sm font-black text-sky-700">대한민국 드론 자격시험 · 드론 안전 · 비행정보 플랫폼</p>
        <h1 className="mt-3 text-4xl font-black leading-tight text-[#0B2545] sm:text-5xl">Drone Pass</h1>
        <p className="mt-3 max-w-2xl text-base font-bold leading-7 text-slate-700">
          자격시험부터 비행 안전, 기체 지식, 교육장 정보까지 한 곳에서 확인하는 드론 학습 포털입니다.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Link href="/study" className="flex h-12 items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 text-sm font-black text-white shadow-lg shadow-sky-700/20 transition hover:bg-sky-800">
            <GraduationCap size={19} />
            드론 자격시험 학습
          </Link>
          <Link href="/fishing-safety" className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#0B2545] px-4 text-sm font-black text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-950">
            <ShieldCheck size={19} />
            비행 안전 가이드
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-sky-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-black text-slate-500">문제은행</p>
          <p className="mt-1 text-lg font-black text-slate-950">준비중</p>
        </div>
        <div className="rounded-xl border border-sky-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-black text-slate-500">용어사전</p>
          <p className="mt-1 text-lg font-black text-slate-950">50개</p>
        </div>
        <div className="rounded-xl border border-sky-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-black text-slate-500">FAQ</p>
          <p className="mt-1 text-lg font-black text-slate-950">30개</p>
        </div>
        <div className="rounded-xl border border-sky-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-black text-slate-500">비행정보</p>
          <p className="mt-1 text-lg font-black text-slate-950">검증 예정</p>
        </div>
      </section>

      <section className="space-y-3">
        {groups.map((group, index) => (
          <FeatureGroup key={group.title} group={group} defaultOpen={index === 0} />
        ))}
      </section>
    </div>
  );
}
