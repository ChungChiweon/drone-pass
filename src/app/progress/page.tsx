import { Trophy } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";

export default function ProgressPage() {
  return (
    <AppFrame>
      <section className="rounded-[2rem] border border-amber-100 bg-amber-50 p-8 text-center shadow-sm">
        <Trophy className="mx-auto text-amber-700" size={36} />
        <h1 className="mt-4 text-3xl font-black text-amber-950">학습 진도 재설계 예정</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-7 text-amber-900">
          기존 진도율은 questionId 배열에 묶여 있어 비활성화했습니다. 새 구조는 conceptId와 factId 기반 숙련도로 전환합니다.
        </p>
      </section>
    </AppFrame>
  );
}
