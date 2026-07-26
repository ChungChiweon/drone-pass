import { RotateCcw } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";

export default function RandomPage() {
  return (
    <AppFrame>
      <section className="rounded-[2rem] border border-amber-100 bg-amber-50 p-8 text-center shadow-sm">
        <RotateCcw className="mx-auto text-amber-700" size={36} />
        <h1 className="mt-4 text-3xl font-black text-amber-950">랜덤문제 준비중</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-7 text-amber-900">
          드론 문제은행이 준비되기 전까지 기존 해양 문항을 랜덤문제로 표시하지 않습니다.
        </p>
      </section>
    </AppFrame>
  );
}
