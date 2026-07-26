import Link from "next/link";
import { AlertTriangle, BatteryCharging, CheckCircle2, CloudSun, LifeBuoy, MapPin, Radio, ShieldCheck, Wind } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";

const safetySections = [
  { title: "비행 가능 조건", icon: Wind, points: ["풍속, 돌풍, 강수, 시정 정보를 함께 확인합니다.", "기체 성능 한계에 가까운 날씨라면 비행을 중지합니다.", "안개, 비, 눈, 강한 역광에서는 기체 식별이 어려워질 수 있습니다."] },
  { title: "현장 통제", icon: MapPin, points: ["사람, 차량, 건물, 전선, 나무와 안전거리를 확보합니다.", "이륙지점과 비상 착륙지점을 먼저 정합니다.", "주변 사람에게 비행 범위와 주의사항을 알립니다."] },
  { title: "기체/배터리 점검", icon: BatteryCharging, points: ["프로펠러 균열, 암 체결, 배터리 고정 상태를 확인합니다.", "배터리 셀 전압과 온도, 외관 손상을 확인합니다.", "홈포인트와 RTH 고도 설정을 비행 전에 확인합니다."] },
  { title: "비상 대응", icon: LifeBuoy, points: ["신호 약화, 저전압, 센서 이상이 보이면 즉시 복귀나 착륙을 준비합니다.", "기체를 무리하게 회수하려고 위험 구역에 들어가지 않습니다.", "사고나 민원이 발생하면 비행을 멈추고 상황을 기록합니다."] }
];

const checklistGroups = [
  { title: "비행 전", items: ["장소와 공역 확인", "날씨와 시정 확인", "배터리와 프로펠러 확인", "홈포인트 확인", "보조자 역할 공유"] },
  { title: "비행 중", items: ["기체 시야 유지", "배터리 잔량 확인", "주변 사람 접근 확인", "돌풍 발생 시 안정화", "이상 경고 시 복귀"] },
  { title: "비행 후", items: ["기체 전원 차단", "배터리 온도 확인", "프로펠러 손상 확인", "비행 기록 정리", "다음 비행 이슈 메모"] }
];

const avoidItems = ["사람 위 비행", "강풍 속 무리한 촬영", "저전압 경고 무시", "비행금지구역 미확인", "파손 프로펠러 사용", "홈포인트 미설정"];

export default function FishingSafetyPage() {
  return (
    <AppFrame>
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[2rem] bg-[#0B2545] text-white shadow-sm">
          <div className="p-6 sm:p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-cyan-100 ring-1 ring-white/20">
              <ShieldCheck size={30} />
            </div>
            <p className="mt-5 text-sm font-black text-cyan-100">Drone Pass Safety Guide</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">드론 비행 안전 가이드</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-cyan-50 sm:text-base">
              드론 비행 전 확인해야 할 기본 안전 기준입니다. 실제 법령, 공역, 비행승인, 금지구역 정보는 최신 공식 안내를 반드시 확인해야 합니다.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/sea-info" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-[#0B2545] transition hover:bg-cyan-50">
                <CloudSun size={18} />
                비행정보 보기
              </Link>
              <Link href="/dictionary" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-5 text-sm font-black text-white transition hover:bg-cyan-700">
                <Radio size={18} />
                용어사전 보기
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          {safetySections.map((section) => {
            const Icon = section.icon;
            return (
              <article key={section.title} className="rounded-[1.5rem] border border-cyan-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
                    <Icon size={22} />
                  </div>
                  <h2 className="text-lg font-black text-slate-950">{section.title}</h2>
                </div>
                <div className="mt-4 grid gap-2">
                  {section.points.map((point) => (
                    <p key={point} className="flex gap-2 text-sm font-semibold leading-6 text-slate-700">
                      <CheckCircle2 className="mt-0.5 shrink-0 text-cyan-700" size={16} />
                      <span>{point}</span>
                    </p>
                  ))}
                </div>
              </article>
            );
          })}
        </section>

        <section className="rounded-[2rem] border border-cyan-100 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-black text-slate-950">비행 전후 체크리스트</h2>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {checklistGroups.map((group) => (
              <article key={group.title} className="rounded-2xl bg-slate-50 p-4">
                <h3 className="text-base font-black text-slate-950">{group.title}</h3>
                <div className="mt-3 grid gap-2">
                  {group.items.map((item) => (
                    <label key={item} className="flex min-h-9 items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-cyan-100">
                      <input type="checkbox" className="h-4 w-4 rounded border-cyan-200 text-cyan-700" />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-amber-100 bg-amber-50 p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="shrink-0 text-amber-700" size={24} />
            <h2 className="text-xl font-black text-amber-950">초보자가 피해야 할 행동</h2>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {avoidItems.map((item) => (
              <div key={item} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-amber-900 ring-1 ring-amber-100">
                {item}
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppFrame>
  );
}
