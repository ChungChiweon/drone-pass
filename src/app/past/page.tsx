import Link from "next/link";
import { BookOpenCheck, FileClock, ShieldCheck } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";

export default function PastPage() {
  return (
    <AppFrame>
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[2rem] bg-[#0F2D52] text-white shadow-sm">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(56,189,248,0.35),transparent_35%),linear-gradient(135deg,rgba(14,116,144,0.45),transparent_55%)]" />
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-sky-100 ring-1 ring-white/20">
                <FileClock size={30} />
              </div>
              <p className="mt-5 text-sm font-black text-sky-100">Drone Pass Past Questions</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">드론 기출/공식 문제 준비중</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-sky-50 sm:text-base">
                기존 보트·해양 문제은행은 사용하지 않습니다. 드론 자격시험 문제는 공식 출처 확인과 검수 절차를 거친 뒤 별도 데이터로 연결할 예정입니다.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <Link href="/study" className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md">
            <BookOpenCheck className="text-sky-700" size={26} />
            <h2 className="mt-4 text-lg font-black text-slate-950">샘플 학습 엔진 보기</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              현재 학습 화면은 공식 문제가 아닌 구조 검증용 샘플 문항만 제공합니다.
            </p>
          </Link>

          <Link href="/fishing-safety" className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md">
            <ShieldCheck className="text-sky-700" size={26} />
            <h2 className="mt-4 text-lg font-black text-slate-950">비행 안전 가이드</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              문제은행 구축 전에도 활용할 수 있는 드론 비행 안전 체크 흐름을 먼저 확인할 수 있습니다.
            </p>
          </Link>
        </section>
      </div>
    </AppFrame>
  );
}
