import { Building2, MapPin, Search, ShieldCheck } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";
import { droneCenters } from "@/data/drone-centers";

export default function CentersPage() {
  return (
    <AppFrame>
      <div className="space-y-5">
        <section className="rounded-[2rem] bg-[#0B2545] p-6 text-white shadow-sm sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-cyan-100 ring-1 ring-white/20">
            <Building2 size={30} />
          </div>
          <p className="mt-5 text-sm font-black text-cyan-100">Drone Pass Center Finder</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">드론 교육장/시험장</h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-cyan-50 sm:text-base">
            실제 교육원과 시험장 데이터는 공식 출처 검증 후 반영합니다. 현재는 드론 포털 IA를 위한 placeholder 페이지입니다.
          </p>
        </section>

        <section className="rounded-[2rem] border border-cyan-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Search className="text-cyan-700" size={24} />
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-cyan-700">Placeholder</p>
              <h2 className="text-xl font-black text-slate-950">검색 기능 준비중</h2>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {["지역 필터", "교육원/시험장 구분", "공식 링크 확인"].map((item) => (
              <div key={item} className="rounded-2xl bg-slate-50 p-4 text-sm font-black text-slate-700 ring-1 ring-cyan-100">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          {droneCenters.map((center) => (
            <article key={center.id} className="rounded-2xl border border-cyan-100 bg-white p-5 shadow-sm">
              <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">준비중</span>
              <h2 className="mt-3 text-lg font-black text-slate-950">{center.name}</h2>
              <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-600">
                <MapPin size={17} className="text-cyan-700" />
                {center.region}
              </p>
              <p className="mt-3 flex gap-2 rounded-2xl bg-cyan-50 p-4 text-sm font-semibold leading-6 text-slate-700">
                <ShieldCheck size={18} className="mt-0.5 shrink-0 text-cyan-700" />
                방문, 접수, 시험 가능 여부는 공식 기관 안내를 확인해야 합니다.
              </p>
            </article>
          ))}
        </section>
      </div>
    </AppFrame>
  );
}
