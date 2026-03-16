"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { APP_NAME, PLAN_LABELS, type AppPlanValue } from "@/lib/constants";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/", label: "ホーム", exact: true },
  { href: "/search", label: "チャンネル検索" },
  { href: "/channels", label: "一覧管理" },
  { href: "/mail-builder", label: "営業メール作成" },
  { href: "/mail-templates", label: "営業テンプレ設定" },
  { href: "/mail-drafts", label: "下書き一覧" },
  { href: "/settings", label: "AI設定" },
];

export function TopNav({ plan }: { plan: AppPlanValue }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-white/88 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white shadow-sm">
            TL
          </div>
          <div>
            <p className="font-serif text-xl font-semibold text-slate-950">{APP_NAME}</p>
            <p className="text-xs text-slate-500">YouTube営業リスト兼分析MVP</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 lg:flex">
          {navigation.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  active
                    ? "nav-pill-active bg-slate-900 text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-950",
                )}
              >
                <span className={active ? "text-white" : "text-inherit"}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 shadow-sm">
          現在のプラン: <span className="font-semibold text-slate-900">{PLAN_LABELS[plan]}</span>
        </div>
      </div>
    </header>
  );
}
