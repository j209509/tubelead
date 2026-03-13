"use client";

import type { ReactNode } from "react";
import { useCallback, useState } from "react";

import { ChannelsTableClient } from "@/components/channels/channels-table-client";
import type { DashboardStats, ChannelListResult } from "@/lib/channels";
import type { ChannelFiltersInput } from "@/lib/schemas";
import { formatNumber } from "@/lib/utils";

type SalesSummaryCard = {
  key: keyof DashboardStats;
  label: string;
  accent?: boolean;
  helper?: string;
};

const salesSummaryCards: SalesSummaryCard[] = [
  { key: "totalChannels", label: "総件数", accent: true, helper: "保存済みチャンネルベース" },
  { key: "emailCount", label: "メールあり件数" },
  { key: "formCount", label: "フォームあり件数" },
  { key: "socialCount", label: "SNSあり件数" },
  { key: "officialSiteCount", label: "公式サイトあり件数" },
  { key: "bestEmailCount", label: "bestContact=email" },
  { key: "bestFormCount", label: "bestContact=form" },
] as const;

type SalesResultsClientProps = {
  data: ChannelListResult;
  filters: ChannelFiltersInput;
  currentQueryString: string;
  children?: ReactNode;
};

export function SalesResultsClient({ data, filters, currentQueryString, children }: SalesResultsClientProps) {
  const [stats, setStats] = useState<DashboardStats>(data.stats);
  const handleStatsChange = useCallback((next: DashboardStats) => {
    setStats(next);
  }, []);

  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        {salesSummaryCards.map((card) => {
          const value = stats[card.key as keyof DashboardStats];

          return (
            <div key={card.key} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div
                className={
                  card.accent
                    ? "flex min-h-[140px] flex-col rounded-[20px] border-l-4 border-blue-500 pl-4"
                    : "flex min-h-[140px] flex-col"
                }
              >
                <p className="min-h-[2.75rem] text-sm leading-5 text-slate-500">{card.label}</p>
                <p className="mt-4 text-5xl font-semibold leading-none tracking-tight text-slate-950">
                  {formatNumber(value)}
                </p>
                <p className="mt-auto pt-4 text-sm leading-5 text-slate-500">
                  {card.helper || ""}
                </p>
              </div>
            </div>
          );
        })}
      </section>

      {children}

      <ChannelsTableClient
        initialItems={data.items}
        initialStats={data.stats}
        lockedCount={data.lockedCount}
        plan={data.plan}
        mode={filters.mode}
        totalCount={data.total}
        currentSort={filters.sort}
        currentQueryString={currentQueryString}
        autoScanIds={data.autoScanIds}
        initialAutoScanStatus={data.autoScanStatus}
        onStatsChange={handleStatsChange}
      />
    </>
  );
}
