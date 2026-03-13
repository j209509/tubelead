import Link from "next/link";

import { ChannelsTableClient } from "@/components/channels/channels-table-client";
import { UpgradeDialog } from "@/components/channels/upgrade-dialog";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CHANNEL_SORT_LABELS, MODE_LABELS, type AppModeValue } from "@/lib/constants";
import { getChannelList, getRivalDashboardSummary } from "@/lib/channels";
import { channelFiltersSchema, type ChannelFiltersInput } from "@/lib/schemas";
import { formatCompactNumber, formatCurrencyYen, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

function toQueryString(filters: ChannelFiltersInput, overrides?: Partial<ChannelFiltersInput>) {
  const params = new URLSearchParams();
  const merged = { ...filters, ...overrides };

  if (merged.mode) params.set("mode", merged.mode);
  if (merged.q) params.set("q", merged.q);
  if (merged.minSubscribers) params.set("minSubscribers", String(merged.minSubscribers));
  if (merged.minVideos) params.set("minVideos", String(merged.minVideos));
  if (merged.minContactabilityScore) params.set("minContactabilityScore", String(merged.minContactabilityScore));
  if (merged.minAvgViewsLast10) params.set("minAvgViewsLast10", String(merged.minAvgViewsLast10));
  if (merged.minPostsLast30) params.set("minPostsLast30", String(merged.minPostsLast30));
  if (merged.minOpportunityScore) params.set("minOpportunityScore", String(merged.minOpportunityScore));
  if (merged.minEstimatedMonthlyIncomeBase) {
    params.set("minEstimatedMonthlyIncomeBase", String(merged.minEstimatedMonthlyIncomeBase));
  }
  if (merged.maxShortsRatio < 100) params.set("maxShortsRatio", String(merged.maxShortsRatio));
  if (merged.publishedWithinDays) params.set("publishedWithinDays", String(merged.publishedWithinDays));
  if (merged.hasEmail) params.set("hasEmail", "true");
  if (merged.hasForm) params.set("hasForm", "true");
  if (merged.hasSocial) params.set("hasSocial", "true");
  if (merged.hasOfficialSite) params.set("hasOfficialSite", "true");
  if (merged.onlyUnreviewed) params.set("onlyUnreviewed", "true");
  if (merged.hasVideoContact) params.set("hasVideoContact", "true");
  if (merged.hasExternalContact) params.set("hasExternalContact", "true");
  if (merged.sourceQuery) params.set("sourceQuery", merged.sourceQuery);
  if (merged.sort) params.set("sort", merged.sort);
  if (merged.page) params.set("page", String(merged.page));

  return params.toString();
}

const DEFAULT_FILTERS: ChannelFiltersInput = {
  mode: "sales",
  q: "",
  minSubscribers: 0,
  minVideos: 0,
  minContactabilityScore: 0,
  minAvgViewsLast10: 0,
  minPostsLast30: 0,
  minOpportunityScore: 0,
  minEstimatedMonthlyIncomeBase: 0,
  maxShortsRatio: 100,
  publishedWithinDays: 0,
  hasEmail: false,
  hasForm: false,
  hasSocial: false,
  hasOfficialSite: false,
  onlyUnreviewed: false,
  hasVideoContact: false,
  hasExternalContact: false,
  sourceQuery: "",
  sort: "updated",
  page: 1,
};

const salesSummaryCards = [
  { key: "totalChannels", label: "表示対象" },
  { key: "emailCount", label: "メールあり" },
  { key: "formCount", label: "フォームあり" },
  { key: "socialCount", label: "SNSあり" },
  { key: "officialSiteCount", label: "外部サイトあり" },
  { key: "bestEmailCount", label: "優先: メール" },
  { key: "bestFormCount", label: "優先: フォーム" },
] as const;

function ModeTabs({ currentMode }: { currentMode: AppModeValue }) {
  return (
    <div className="inline-flex rounded-md border border-zinc-200 bg-white p-0.5">
      {(["sales", "rival"] as const).map((mode) => {
        const active = currentMode === mode;
        return (
          <Link
            key={mode}
            href={`/channels?${toQueryString({ ...DEFAULT_FILTERS, mode }, { mode })}`}
            className={
              active
                ? "rounded px-3 py-1.5 text-sm font-medium bg-zinc-900 text-white"
                : "rounded px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            }
          >
            {MODE_LABELS[mode]}
          </Link>
        );
      })}
    </div>
  );
}

export default async function ChannelsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const parsed = channelFiltersSchema.safeParse(params);
  const baseFilters = parsed.success ? parsed.data : DEFAULT_FILTERS;
  const filters =
    baseFilters.mode === "rival" && typeof params.sort !== "string"
      ? { ...baseFilters, sort: "incomeHigh" as const }
      : baseFilters;
  const [data, rivalSummary] = await Promise.all([
    getChannelList(filters, { includeAutoScanIds: filters.mode === "rival" }),
    filters.mode === "rival" ? getRivalDashboardSummary(filters) : Promise.resolve(null),
  ]);

  return (
    <AppShell
      title={filters.mode === "rival" ? "ライバル調査" : "営業リスト"}
      description={
        filters.mode === "rival"
          ? "想定月収、投稿頻度、再生効率を比較できます。動画分析は順次反映されます。"
          : "チャンネルを営業リストとして整理。動画補完は順次進みます。"
      }
      actions={
        <div className="flex items-center gap-2">
          <ModeTabs currentMode={filters.mode} />
          <Button asChild variant="secondary" size="sm">
            <a href={`/api/export/csv?${toQueryString(filters, { page: 1 })}`}>CSV出力</a>
          </Button>
        </div>
      }
    >
      {/* サマリーカード */}
      {filters.mode === "rival" && rivalSummary ? (
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-lg border border-zinc-200 bg-white p-3">
            <p className="text-xs text-zinc-500">該当件数</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-900">{formatNumber(rivalSummary.totalChannels)}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-3">
            <p className="text-xs text-zinc-500">月収中央値</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-900">
              {formatCurrencyYen(rivalSummary.medianMonthlyIncomeBase)}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-3">
            <p className="text-xs text-zinc-500">高頻度投稿</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-900">{formatNumber(rivalSummary.highPostingCount)}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-3">
            <p className="text-xs text-zinc-500">Shorts主体</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-900">{formatNumber(rivalSummary.shortsHeavyCount)}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-3">
            <p className="text-xs text-zinc-500">参入魅力度 高</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-900">
              {formatNumber(rivalSummary.highOpportunityCount)}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-3">
            <p className="text-xs text-zinc-500">月収トップ3</p>
            <div className="mt-1 space-y-0.5">
              {rivalSummary.topIncomeChannels.length > 0 ? (
                rivalSummary.topIncomeChannels.slice(0, 3).map((channel, index) => (
                  <div key={channel.id} className="flex items-center justify-between gap-1 text-xs">
                    <span className="truncate text-zinc-600">
                      {index + 1}. {channel.title}
                    </span>
                    <span className="shrink-0 font-medium tabular-nums text-zinc-900">
                      {formatCompactNumber(channel.estimatedMonthlyIncomeHigh)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-400">分析待ち</p>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {salesSummaryCards.map((card) => (
            <div key={card.key} className="rounded-lg border border-zinc-200 bg-white p-3">
              <p className="text-xs text-zinc-500">{card.label}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-900">
                {formatNumber(data.stats[card.key as keyof typeof data.stats])}
              </p>
            </div>
          ))}
        </section>
      )}

      {/* フィルタ */}
      <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-4 py-2.5">
          <p className="text-sm font-medium text-zinc-900">フィルタ</p>
        </div>
        <form className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6" method="GET">
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="mode" value={filters.mode} />
          <div className="grid gap-1 xl:col-span-2">
            <Label htmlFor="channel-filter-q" className="text-xs text-zinc-500">キーワード</Label>
            <input
              id="channel-filter-q"
              name="q"
              defaultValue={filters.q}
              placeholder="チャンネル名、カテゴリなど"
              className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="channel-filter-source-query" className="text-xs text-zinc-500">検索ソース語</Label>
            <input
              id="channel-filter-source-query"
              name="sourceQuery"
              defaultValue={filters.sourceQuery}
              placeholder="sourceQueries"
              className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="channel-filter-min-subscribers" className="text-xs text-zinc-500">最低登録者</Label>
            <input
              id="channel-filter-min-subscribers"
              name="minSubscribers"
              type="number"
              min={0}
              defaultValue={filters.minSubscribers}
              placeholder="0"
              className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="channel-filter-min-videos" className="text-xs text-zinc-500">最低動画数</Label>
            <input
              id="channel-filter-min-videos"
              name="minVideos"
              type="number"
              min={0}
              defaultValue={filters.minVideos}
              placeholder="0"
              className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {filters.mode === "rival" ? (
            <>
              <div className="grid gap-1">
                <Label htmlFor="channel-filter-min-avg-views" className="text-xs text-zinc-500">平均再生 以上</Label>
                <input
                  id="channel-filter-min-avg-views"
                  name="minAvgViewsLast10"
                  type="number"
                  min={0}
                  defaultValue={filters.minAvgViewsLast10}
                  placeholder="0"
                  className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="channel-filter-income-base" className="text-xs text-zinc-500">月収 base 以上</Label>
                <input
                  id="channel-filter-income-base"
                  name="minEstimatedMonthlyIncomeBase"
                  type="number"
                  min={0}
                  defaultValue={filters.minEstimatedMonthlyIncomeBase}
                  placeholder="0"
                  className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="channel-filter-posts-last30" className="text-xs text-zinc-500">30日投稿 以上</Label>
                <input
                  id="channel-filter-posts-last30"
                  name="minPostsLast30"
                  type="number"
                  min={0}
                  defaultValue={filters.minPostsLast30}
                  placeholder="0"
                  className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="channel-filter-opportunity" className="text-xs text-zinc-500">参入魅力度 以上</Label>
                <input
                  id="channel-filter-opportunity"
                  name="minOpportunityScore"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={filters.minOpportunityScore}
                  placeholder="0"
                  className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-1">
                <Label htmlFor="channel-filter-contactability" className="text-xs text-zinc-500">連絡可能性 以上</Label>
                <input
                  id="channel-filter-contactability"
                  name="minContactabilityScore"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={filters.minContactabilityScore}
                  placeholder="0"
                  className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="channel-filter-sort-sales" className="text-xs text-zinc-500">並び順</Label>
                <select
                  id="channel-filter-sort-sales"
                  name="sort"
                  defaultValue={filters.sort}
                  className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {Object.entries(CHANNEL_SORT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {filters.mode === "rival" ? (
            <>
              <div className="grid gap-1">
                <Label htmlFor="channel-filter-sort-rival" className="text-xs text-zinc-500">並び順</Label>
                <select
                  id="channel-filter-sort-rival"
                  name="sort"
                  defaultValue={filters.sort}
                  className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {Object.entries(CHANNEL_SORT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1">
                <Label htmlFor="channel-filter-shorts-ratio" className="text-xs text-zinc-500">Shorts率 以下</Label>
                <input
                  id="channel-filter-shorts-ratio"
                  name="maxShortsRatio"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={filters.maxShortsRatio}
                  placeholder="100"
                  className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="channel-filter-published-within" className="text-xs text-zinc-500">投稿日 何日以内</Label>
                <input
                  id="channel-filter-published-within"
                  name="publishedWithinDays"
                  type="number"
                  min={0}
                  defaultValue={filters.publishedWithinDays}
                  placeholder="30"
                  className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </>
          ) : null}

          {filters.mode === "sales" ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:col-span-2 lg:col-span-4 xl:col-span-6">
              <label className="flex items-center gap-1.5 text-xs text-zinc-600">
                <input type="checkbox" name="hasEmail" value="true" defaultChecked={filters.hasEmail} className="h-3.5 w-3.5 rounded border-zinc-300" />
                メールあり
              </label>
              <label className="flex items-center gap-1.5 text-xs text-zinc-600">
                <input type="checkbox" name="hasForm" value="true" defaultChecked={filters.hasForm} className="h-3.5 w-3.5 rounded border-zinc-300" />
                フォームあり
              </label>
              <label className="flex items-center gap-1.5 text-xs text-zinc-600">
                <input type="checkbox" name="hasSocial" value="true" defaultChecked={filters.hasSocial} className="h-3.5 w-3.5 rounded border-zinc-300" />
                SNSあり
              </label>
              <label className="flex items-center gap-1.5 text-xs text-zinc-600">
                <input type="checkbox" name="hasOfficialSite" value="true" defaultChecked={filters.hasOfficialSite} className="h-3.5 w-3.5 rounded border-zinc-300" />
                外部サイトあり
              </label>
              <label className="flex items-center gap-1.5 text-xs text-zinc-600">
                <input type="checkbox" name="hasVideoContact" value="true" defaultChecked={filters.hasVideoContact} className="h-3.5 w-3.5 rounded border-zinc-300" />
                動画欄から抽出
              </label>
              <label className="flex items-center gap-1.5 text-xs text-zinc-600">
                <input type="checkbox" name="hasExternalContact" value="true" defaultChecked={filters.hasExternalContact} className="h-3.5 w-3.5 rounded border-zinc-300" />
                外部から抽出
              </label>
              <label className="flex items-center gap-1.5 text-xs text-zinc-600">
                <input type="checkbox" name="onlyUnreviewed" value="true" defaultChecked={filters.onlyUnreviewed} className="h-3.5 w-3.5 rounded border-zinc-300" />
                未確認のみ
              </label>
            </div>
          ) : null}

          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4 xl:col-span-6 xl:justify-end">
            <Button type="submit" size="sm">絞り込む</Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/channels?mode=${filters.mode}`}>リセット</Link>
            </Button>
          </div>
        </form>
      </div>

      {data.lockedCount > 0 ? (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-amber-900">無料版の表示上限</p>
            <p className="text-xs text-amber-700">
              総件数 {data.total} 件中、先頭 10 件まで表示されます。
            </p>
          </div>
          <UpgradeDialog triggerLabel="全件表示" />
        </div>
      ) : null}

      <ChannelsTableClient
        initialItems={data.items}
        lockedCount={data.lockedCount}
        plan={data.plan}
        mode={filters.mode}
        totalCount={data.total}
        currentSort={filters.sort}
        currentQueryString={toQueryString(filters)}
        autoScanIds={data.autoScanIds}
        initialAutoScanStatus={data.autoScanStatus}
      />

      {data.plan === "PRO" && data.totalPages > 1 ? (
        <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2">
          <p className="text-xs text-zinc-500">
            {data.page} / {data.totalPages} ページ
          </p>
          <div className="flex gap-1">
            <Button
              asChild
              variant="outline"
              size="sm"
              className={data.page <= 1 ? "pointer-events-none opacity-40" : ""}
            >
              <Link href={`/channels?${toQueryString(filters, { page: Math.max(1, data.page - 1) })}`}>前へ</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className={data.page >= data.totalPages ? "pointer-events-none opacity-40" : ""}
            >
              <Link href={`/channels?${toQueryString(filters, { page: Math.min(data.totalPages, data.page + 1) })}`}>次へ</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
