import { BarChart3 } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";

export default function AnalysisPage() {
  return (
    <AppFrame>
      <section className="rounded-[2rem] border border-amber-100 bg-amber-50 p-8 text-center shadow-sm">
        <BarChart3 className="mx-auto text-amber-700" size={36} />
        <h1 className="mt-4 text-3xl font-black text-amber-950">학습분석 준비중</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-7 text-amber-900">
          분석 UI와 저장 구조는 재활용하되, 드론 문항 데이터 연결 전까지 학습 결과를 생성하지 않습니다.
        </p>
      </section>
    </AppFrame>
  );
}
