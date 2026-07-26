import { BookOpenCheck } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";

export default function TheoryPage() {
  return (
    <AppFrame>
      <section className="rounded-[2rem] border border-amber-100 bg-amber-50 p-8 text-center shadow-sm">
        <BookOpenCheck className="mx-auto text-amber-700" size={36} />
        <h1 className="mt-4 text-3xl font-black text-amber-950">이론학습 재구성 예정</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-7 text-amber-900">
          기존 보트/해양 이론 데이터는 제거 대상입니다. 다음 단계에서 SourceDocument, Concept, AtomicFact 기반 이론학습으로 연결합니다.
        </p>
      </section>
    </AppFrame>
  );
}
