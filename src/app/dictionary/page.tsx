"use client";

import { useMemo, useState } from "react";
import { BookOpen, Filter, Search } from "lucide-react";
import { AppFrame } from "@/components/boat/AppFrame";
import { droneDictionary, droneDictionaryCategories, type DroneDictionaryCategory } from "@/data/drone-dictionary";

type CategoryFilter = DroneDictionaryCategory | "전체";

function getCategoryCount(category: DroneDictionaryCategory) {
  return droneDictionary.filter((item) => item.category === category).length;
}

export default function DictionaryPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("전체");

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return droneDictionary.filter((item) => {
      const matchesCategory = category === "전체" || item.category === category;
      const searchable = [item.term, item.category, item.shortDescription, item.description, ...item.relatedTerms].join(" ").toLowerCase();
      return matchesCategory && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [category, query]);

  return (
    <AppFrame>
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[2rem] bg-[#0B2545] text-white shadow-sm">
          <div className="p-6 sm:p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-cyan-100 ring-1 ring-white/20">
              <BookOpen size={30} />
            </div>
            <p className="mt-5 text-sm font-black text-cyan-100">Drone Pass Dictionary</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">드론 용어사전</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-cyan-50 sm:text-base">
              자격시험, 기체, 비행안전, 기상, 운용, 장비에서 자주 만나는 드론 용어 50개 샘플입니다.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-2xl font-black">{droneDictionary.length}</p>
                <p className="mt-1 text-xs font-bold text-cyan-100">등록 용어</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-2xl font-black">{droneDictionaryCategories.length}</p>
                <p className="mt-1 text-xs font-bold text-cyan-100">카테고리</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-cyan-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr] lg:items-end">
            <label className="grid gap-2 text-sm font-black text-slate-800">
              <span className="flex items-center gap-2">
                <Search size={18} className="text-cyan-700" />
                용어 검색
              </span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="호버링, RTH, 배터리..." className="min-h-12 rounded-2xl border border-cyan-100 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white" />
            </label>

            <label className="grid gap-2 text-sm font-black text-slate-800">
              <span className="flex items-center gap-2">
                <Filter size={18} className="text-cyan-700" />
                카테고리
              </span>
              <select value={category} onChange={(event) => setCategory(event.target.value as CategoryFilter)} className="min-h-12 rounded-2xl border border-cyan-100 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-cyan-400 focus:bg-white">
                <option value="전체">전체 카테고리</option>
                {droneDictionaryCategories.map((item) => (
                  <option key={item} value={item}>
                    {item} ({getCategoryCount(item)})
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          {filteredItems.map((item) => (
            <article key={item.id} className="rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm">
              <span className="inline-flex rounded-full bg-cyan-100 px-3 py-1 text-[11px] font-black text-cyan-800">{item.category}</span>
              <h2 className="mt-3 text-lg font-black text-slate-950">{item.term}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{item.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.relatedTerms.map((term) => (
                  <span key={`${item.id}-${term}`} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                    {term}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </section>
      </div>
    </AppFrame>
  );
}
