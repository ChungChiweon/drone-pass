import { BookOpenCheck } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";

export default function TheoryTagPage() {
  return (
    <AppFrame>
      <section className="rounded-[2rem] border border-amber-100 bg-amber-50 p-8 text-center shadow-sm">
        <BookOpenCheck className="mx-auto text-amber-700" size={36} />
        <h1 className="mt-4 text-3xl font-black text-amber-950">개념 상세 준비중</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-7 text-amber-900">
          기존 태그 기반 이론 연결은 제거했습니다. 새 개념 상세는 Concept와 AtomicFact 기반으로 다시 연결합니다.
        </p>
      </section>
    </AppFrame>
  );
}
