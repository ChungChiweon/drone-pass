"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpenCheck, ClipboardList, Home, Map, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "홈", icon: Home },
  { href: "/study", label: "학습", icon: BookOpenCheck },
  { href: "/fishing-safety", label: "안전", icon: ShieldCheck },
  { href: "/sea-info", label: "정보", icon: Map },
  { href: "/exam", label: "모의", icon: ClipboardList },
  { href: "/analysis", label: "분석", icon: BarChart3 }
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-cyan-100 bg-white/95 shadow-[0_-10px_30px_rgba(15,45,82,0.08)] backdrop-blur lg:hidden">
      <div className="mx-auto grid h-16 max-w-xl grid-cols-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("flex min-w-0 flex-col items-center justify-center gap-1 text-[10px] font-bold text-slate-500", active && "text-cyan-700")}
            >
              <Icon size={19} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
