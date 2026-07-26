import { NotebookTabs } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";

export default function WrongPage() {
  return (
    <AppFrame>
      <section className="rounded-[2rem] border border-amber-100 bg-amber-50 p-8 text-center shadow-sm">
        <NotebookTabs className="mx-auto text-amber-700" size={36} />
        <h1 className="mt-4 text-3xl font-black text-amber-950">오답노트 재연결 예정</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-7 text-amber-900">
          기존 숫자형 문제 ID 기반 오답노트는 사용하지 않습니다. 다음 단계에서 GeneratedQuestion과 concept/fact 기반 학습 기록으로 연결합니다.
        </p>
      </section>
    </AppFrame>
  );
}
