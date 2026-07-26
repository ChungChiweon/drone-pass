"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Filter, HelpCircle, Search } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";
import { droneFaqCategories, droneFaqItems, type DroneFaqCategory } from "@/data/drone-faq-data";

type FaqCategoryFilter = DroneFaqCategory | "전체";

function getCategoryCount(category: DroneFaqCategory) {
  return droneFaqItems.filter((item) => item.category === category).length;
}

export default function FaqPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FaqCategoryFilter>("전체");
  const [openId, setOpenId] = useState<string | null>(null);

  const filteredFaqs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return droneFaqItems.filter((item) => {
      const matchesCategory = category === "전체" || item.category === category;
      const searchable = [item.category, item.question, item.answer].join(" ").toLowerCase();
      return matchesCategory && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [category, query]);

  return (
    <AppFrame>
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[2rem] bg-[#0B2545] text-white shadow-sm">
          <div className="p-6 sm:p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-cyan-100 ring-1 ring-white/20">
              <HelpCircle size={30} />
            </div>
            <p className="mt-5 text-sm font-black text-cyan-100">Drone Pass FAQ</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">드론 상식센터</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-cyan-50 sm:text-base">
              자격시험 준비, 비행 안전, 장비 관리, 포털 전환 계획에 관한 샘플 FAQ 30개를 제공합니다.
            </p>
          </div>
        </section>

        <section className="rounded-[2rem] border border-cyan-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr] lg:items-end">
            <label className="grid gap-2 text-sm font-black text-slate-800">
              <span className="flex items-center gap-2">
                <Search size={18} className="text-cyan-700" />
                FAQ 검색
              </span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="문제은행, 배터리, 공역..." className="min-h-12 rounded-2xl border border-cyan-100 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white" />
            </label>
            <label className="grid gap-2 text-sm font-black text-slate-800">
              <span className="flex items-center gap-2">
                <Filter size={18} className="text-cyan-700" />
                카테고리
              </span>
              <select value={category} onChange={(event) => setCategory(event.target.value as FaqCategoryFilter)} className="min-h-12 rounded-2xl border border-cyan-100 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-cyan-400 focus:bg-white">
                <option value="전체">전체 FAQ</option>
                {droneFaqCategories.map((item) => (
                  <option key={item} value={item}>
                    {item} ({getCategoryCount(item)})
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-2">
          {filteredFaqs.map((item) => {
            const isOpen = openId === item.id;
            return (
              <article key={item.id} className="rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm">
                <button type="button" onClick={() => setOpenId(isOpen ? null : item.id)} className="w-full text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-flex rounded-full bg-cyan-100 px-3 py-1 text-[11px] font-black text-cyan-800">{item.category}</span>
                      <h2 className="mt-3 text-base font-black leading-6 text-slate-950">{item.question}</h2>
                    </div>
                    <ChevronDown className={`mt-1 shrink-0 text-cyan-700 transition ${isOpen ? "rotate-180" : ""}`} size={20} />
                  </div>
                </button>
                {isOpen ? <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-semibold leading-7 text-slate-700">{item.answer}</p> : null}
              </article>
            );
          })}
        </section>
      </div>
    </AppFrame>
  );
}
