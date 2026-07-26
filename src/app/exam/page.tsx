import { ClipboardList } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";

export default function ExamPage() {
  return (
    <AppFrame>
      <section className="rounded-[2rem] border border-amber-100 bg-amber-50 p-8 text-center shadow-sm">
        <ClipboardList className="mx-auto text-amber-700" size={36} />
        <h1 className="mt-4 text-3xl font-black text-amber-950">드론 모의고사 준비중</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-7 text-amber-900">
          실제 드론 자격시험 기준과 문항 검증이 끝난 뒤 모의고사 기능에 연결합니다.
        </p>
      </section>
    </AppFrame>
  );
}
