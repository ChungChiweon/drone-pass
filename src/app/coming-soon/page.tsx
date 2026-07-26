import Link from "next/link";
import { ArrowLeft, Clock, Plane } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";

type ComingSoonPageProps = {
  searchParams: Promise<{
    feature?: string;
    section?: string;
  }>;
};

export default async function ComingSoonPage({ searchParams }: ComingSoonPageProps) {
  const params = await searchParams;
  const feature = params.feature ?? "준비중 기능";
  const section = params.section ?? "Drone Pass";

  return (
    <AppFrame>
      <section className="mx-auto max-w-2xl rounded-[2rem] border border-cyan-100 bg-white p-7 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan-100 text-cyan-700">
          <Clock size={34} />
        </div>
        <p className="mt-5 text-sm font-black text-cyan-700">{section}</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">{feature}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-slate-500">
          이 기능은 Drone Pass 포털 확장 로드맵에 포함되어 있습니다. 실제 콘텐츠와 외부 정보 연동은 공식 출처 검증 후 순차적으로 공개됩니다.
        </p>
        <div className="mt-6 rounded-2xl bg-cyan-50 p-4 text-left">
          <div className="flex items-start gap-3">
            <Plane className="mt-0.5 shrink-0 text-cyan-700" size={20} />
            <p className="text-sm font-semibold leading-6 text-slate-600">
              문제은행, 공역 지도, 비행정보 API, 교육장 검색, AI 학습 코치는 검증 데이터가 준비되는 대로 연결합니다.
            </p>
          </div>
        </div>
        <Link href="/" className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-cyan-700 px-5 text-sm font-black text-white">
          <ArrowLeft size={18} />
          홈으로 돌아가기
        </Link>
      </section>
    </AppFrame>
  );
}
