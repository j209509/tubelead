"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { APP_NAME, PLAN_LABELS, type AppPlanValue } from "@/lib/constants";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/", label: "ホーム", exact: true },
  { href: "/search", label: "検索" },
  { href: "/channels", label: "一覧" },
  { href: "/settings", label: "設定" },
];

export function TopNav({ plan }: { plan: AppPlanValue }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-xs font-bold text-white">
              TL
            </div>
            <span className="text-base font-semibold text-zinc-900">{APP_NAME}</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navigation.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-zinc-100 text-zinc-900"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">
            {PLAN_LABELS[plan]}
          </span>
        </div>
      </div>
    </header>
  );
}
