import { BatteryCharging, Cpu, Plane, Radio, ShieldCheck } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";
import { droneEquipment } from "@/data/drone-equipment";

const equipmentAreas = [
  { title: "기체백과", icon: Plane, note: "멀티콥터, 고정익, VTOL 등 기체 유형 데이터를 준비합니다." },
  { title: "장비백과", icon: Cpu, note: "조종기, 센서, 짐벌, 충전 장비 정보를 준비합니다." },
  { title: "배터리 관리", icon: BatteryCharging, note: "셀 전압, 보관, 충전, 폐기 주의사항을 정리합니다." },
  { title: "통신/영상", icon: Radio, note: "조종 신호, 영상전송, 안테나 기본 개념을 정리합니다." }
];

export default function BoatpediaPage() {
  return (
    <AppFrame>
      <div className="space-y-5">
        <section className="rounded-[2rem] bg-[#0B2545] p-6 text-white shadow-sm sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-cyan-100 ring-1 ring-white/20">
            <Plane size={30} />
          </div>
          <p className="mt-5 text-sm font-black text-cyan-100">Drone Encyclopedia</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">드론 기체백과 · 장비백과</h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-cyan-50 sm:text-base">
            기존 보트백과 구조를 드론 기체와 장비 백과로 전환하는 1차 placeholder입니다.
          </p>
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          {equipmentAreas.map((item) => {
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

        <section className="rounded-[2rem] border border-cyan-100 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
            <ShieldCheck className="text-cyan-700" size={22} />
            1차 장비 샘플
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {droneEquipment.map((item) => (
              <article key={item.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-cyan-100">
                <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-black text-cyan-800">{item.category}</span>
                <h3 className="mt-3 text-lg font-black text-slate-950">{item.name}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{item.note}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppFrame>
  );
}
