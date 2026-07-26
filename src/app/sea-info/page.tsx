import { CloudRain, CloudSun, Eye, Map, ShieldAlert, Wind } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";

const conditions = [
  { title: "풍속/돌풍", icon: Wind, note: "기체 성능과 현장 장애물을 함께 보고 보수적으로 판단합니다." },
  { title: "강수", icon: CloudRain, note: "비, 눈, 습기는 기체와 배터리에 영향을 줄 수 있습니다." },
  { title: "시정", icon: Eye, note: "기체 방향과 위치를 눈으로 식별할 수 있는지 확인합니다." },
  { title: "공역/장소", icon: Map, note: "비행 제한, 금지, 승인 필요 여부는 공식 정보를 확인해야 합니다." }
];

export default function SeaInfoPage() {
  return (
    <AppFrame>
      <div className="space-y-5">
        <section className="rounded-[2rem] bg-[#0B2545] p-6 text-white shadow-sm sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-cyan-100 ring-1 ring-white/20">
            <CloudSun size={30} />
          </div>
          <p className="mt-5 text-sm font-black text-cyan-100">Drone Flight Info</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">드론 비행정보</h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-cyan-50 sm:text-base">
            기존 물때/조석/해상날씨 화면은 드론 비행 가능 조건 허브로 전환 중입니다. 실시간 날씨, 공역, 비행 제한 정보는 공식 출처와 API 검증 후 연결합니다.
          </p>
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          {conditions.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-2xl border border-cyan-100 bg-white p-5 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
                  <Icon size={22} />
                </div>
                <h2 className="mt-4 text-lg font-black text-slate-950">{item.title}</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{item.note}</p>
              </article>
            );
          })}
        </section>

        <section className="rounded-[2rem] border border-amber-100 bg-amber-50 p-5 shadow-sm">
          <div className="flex gap-3">
            <ShieldAlert className="mt-0.5 shrink-0 text-amber-700" size={22} />
            <p className="text-sm font-semibold leading-6 text-amber-900">
              비행금지구역, 승인 필요 여부, 법령, 수수료, 시험 기준은 확인 없이 단정하지 않습니다. 다음 단계에서 공식 출처 기반 데이터로 연결해야 합니다.
            </p>
          </div>
        </section>
      </div>
    </AppFrame>
  );
}
