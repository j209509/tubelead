import Link from "next/link";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

import { ChannelsTableClient } from "@/components/channels/channels-table-client";
import { SalesResultsClient } from "@/components/channels/sales-results-client";
import { UpgradeDialog } from "@/components/channels/upgrade-dialog";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CHANNEL_SORT_LABELS, MODE_LABELS, type AppModeValue, type ChannelSortValue } from "@/lib/constants";
import { getChannelList } from "@/lib/channels";
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

function countRivalActiveFilters(filters: ChannelFiltersInput) {
  return [
    Boolean(filters.q),
    Boolean(filters.sourceQuery),
    filters.minSubscribers > 0,
    filters.minVideos > 0,
    filters.minAvgViewsLast10 > 0,
    filters.minPostsLast30 > 0,
    filters.minOpportunityScore > 0,
    filters.minEstimatedMonthlyIncomeBase > 0,
    filters.maxShortsRatio < 100,
    filters.publishedWithinDays > 0,
  ].filter(Boolean).length;
}

function countSalesActiveFilters(filters: ChannelFiltersInput) {
  return [
    Boolean(filters.q),
    Boolean(filters.sourceQuery),
    filters.minSubscribers > 0,
    filters.minVideos > 0,
    filters.minContactabilityScore > 0,
    filters.hasEmail,
    filters.hasForm,
    filters.hasSocial,
    filters.hasOfficialSite,
    filters.hasVideoContact,
    filters.hasExternalContact,
    filters.onlyUnreviewed,
    filters.sort !== "contactPriority",
  ].filter(Boolean).length;
}

function buildRivalSummary(items: Awaited<ReturnType<typeof getChannelList>>["items"], total: number) {
  const average = (values: number[]) => {
    if (values.length === 0) {
      return 0;
    }

    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  };

  return {
    totalChannels: total,
    averageSubscribers: average(items.map((item) => item.subscriberCount || 0)),
    averageViews: average(items.map((item) => item.avgViewsLast10 || 0)),
    averageIncome: average(items.map((item) => item.estimatedMonthlyIncomeBase || 0)),
  };
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

const SALES_SORT_OPTIONS: ChannelSortValue[] = [
  "contactPriority",
  "updated",
  "subscribers",
  "views",
  "videos",
  "contactability",
  "score",
];

const RIVAL_SORT_OPTIONS: ChannelSortValue[] = [
  "incomeHigh",
  "incomeBase",
  "monthlyViews",
  "avgViews",
  "subscribers",
  "views",
  "videos",
  "posts30",
  "latestVideo",
  "competition",
  "growth",
  "opportunity",
  "updated",
];

function ModeTabs({ currentMode }: { currentMode: AppModeValue }) {
  return (
    <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
      {(["sales", "rival"] as const).map((mode) => {
        const active = currentMode === mode;
        return (
          <Link
            key={mode}
            href={`/channels?${toQueryString({ ...DEFAULT_FILTERS, mode }, { mode })}`}
            className={
              active
                ? "rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                : "rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            }
          >
            {MODE_LABELS[mode]}
          </Link>
        );
      })}
    </div>
  );
}

function FilterInput({
  id,
  name,
  label,
  defaultValue,
  placeholder,
  type = "text",
  min,
  max,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue: string | number;
  placeholder: string;
  type?: "text" | "number";
  min?: number;
  max?: number;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className="text-xs font-medium text-slate-500">
        {label}
      </Label>
      <input
        id={id}
        name={name}
        type={type}
        min={min}
        max={max}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      />
    </div>
  );
}

function SalesFilters({ filters }: { filters: ChannelFiltersInput }) {
  const activeFilterCount = countSalesActiveFilters(filters);

  return (
    <details className="group rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-950">フィルタ</p>
            <p className="text-sm text-slate-500">
              営業モードでは連絡先と抽出済み情報を中心に絞り込みます。初期状態では折りたたみ表示です。
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 md:inline-flex">
            条件 {activeFilterCount} 件
          </div>
          <div className="hidden items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 md:inline-flex">
            並び順: {CHANNEL_SORT_LABELS[filters.sort]}
          </div>
          <ChevronDown className="h-5 w-5 text-slate-400 transition group-open:rotate-180" />
        </div>
      </summary>

      <div className="border-t border-slate-200 px-6 py-6">
        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-6" method="GET">
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="mode" value="sales" />

          <div className="grid gap-2 xl:col-span-2">
            <Label htmlFor="channel-filter-q-sales" className="text-xs font-medium text-slate-500">
              キーワード
            </Label>
            <input
              id="channel-filter-q-sales"
              name="q"
              defaultValue={filters.q}
              placeholder="チャンネル名、カテゴリ、地域、メモで検索"
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <FilterInput
            id="channel-filter-source-query-sales"
            name="sourceQuery"
            label="sourceQuery"
            defaultValue={filters.sourceQuery}
            placeholder="sourceQueries から検索"
          />
          <FilterInput
            id="channel-filter-min-subscribers-sales"
            name="minSubscribers"
            label="登録者数 以上"
            type="number"
            min={0}
            defaultValue={filters.minSubscribers}
            placeholder="0"
          />
          <FilterInput
            id="channel-filter-min-videos-sales"
            name="minVideos"
            label="動画数 以上"
            type="number"
            min={0}
            defaultValue={filters.minVideos}
            placeholder="0"
          />
          <FilterInput
            id="channel-filter-contactability-sales"
            name="minContactabilityScore"
            label="連絡可能性スコア 以上"
            type="number"
            min={0}
            max={100}
            defaultValue={filters.minContactabilityScore}
            placeholder="0"
          />

          <div className="grid gap-2">
            <Label htmlFor="channel-filter-sort-sales" className="text-xs font-medium text-slate-500">
              並び順
            </Label>
            <select
              id="channel-filter-sort-sales"
              name="sort"
              defaultValue={filters.sort}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              {SALES_SORT_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {CHANNEL_SORT_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
            <input type="checkbox" name="hasEmail" value="true" defaultChecked={filters.hasEmail} />
            メールあり
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
            <input type="checkbox" name="hasForm" value="true" defaultChecked={filters.hasForm} />
            フォームあり
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
            <input type="checkbox" name="hasSocial" value="true" defaultChecked={filters.hasSocial} />
            SNSあり
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
            <input type="checkbox" name="hasOfficialSite" value="true" defaultChecked={filters.hasOfficialSite} />
            公式サイトあり
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
            <input type="checkbox" name="hasVideoContact" value="true" defaultChecked={filters.hasVideoContact} />
            動画概要欄から抽出あり
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
            <input type="checkbox" name="hasExternalContact" value="true" defaultChecked={filters.hasExternalContact} />
            外部サイトから抽出あり
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
            <input type="checkbox" name="onlyUnreviewed" value="true" defaultChecked={filters.onlyUnreviewed} />
            未確認のみ
          </label>

          <div className="flex gap-3 md:col-span-2 xl:col-span-6 xl:justify-end">
            <Button asChild variant="secondary">
              <Link href="/channels?mode=sales">リセット</Link>
            </Button>
            <Button type="submit">絞り込む</Button>
          </div>
        </form>
      </div>
    </details>
  );
}

function RivalFilters({ filters }: { filters: ChannelFiltersInput }) {
  const activeFilterCount = countRivalActiveFilters(filters);

  return (
    <details className="group rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-950">フィルタ</p>
            <p className="text-sm text-slate-500">
              初期状態では折りたたみ表示です。必要なときだけ条件を広げて調整できます。
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 md:inline-flex">
            条件 {activeFilterCount} 件
          </div>
          <div className="hidden items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 md:inline-flex">
            並び順: {CHANNEL_SORT_LABELS[filters.sort]}
          </div>
          <ChevronDown className="h-5 w-5 text-slate-400 transition group-open:rotate-180" />
        </div>
      </summary>

      <div className="border-t border-slate-200 px-6 py-6">
        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-6" method="GET">
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="mode" value="rival" />

          <div className="grid gap-2 xl:col-span-2">
            <Label htmlFor="channel-filter-q-rival" className="text-xs font-medium text-slate-500">
              チャンネル名で検索
            </Label>
            <input
              id="channel-filter-q-rival"
              name="q"
              defaultValue={filters.q}
              placeholder="チャンネル名やテーマで検索"
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            />
          </div>

          <FilterInput
            id="channel-filter-source-query-rival"
            name="sourceQuery"
            label="検索ソース語"
            defaultValue={filters.sourceQuery}
            placeholder="元の検索語で絞り込む"
          />
          <FilterInput
            id="channel-filter-min-subscribers-rival"
            name="minSubscribers"
            label="登録者数 以上"
            type="number"
            min={0}
            defaultValue={filters.minSubscribers}
            placeholder="0"
          />
          <FilterInput
            id="channel-filter-min-avg-views-rival"
            name="minAvgViewsLast10"
            label="平均視聴回数 以上"
            type="number"
            min={0}
            defaultValue={filters.minAvgViewsLast10}
            placeholder="0"
          />
          <FilterInput
            id="channel-filter-income-base-rival"
            name="minEstimatedMonthlyIncomeBase"
            label="想定月収 base 以上"
            type="number"
            min={0}
            defaultValue={filters.minEstimatedMonthlyIncomeBase}
            placeholder="0"
          />
          <FilterInput
            id="channel-filter-min-videos-rival"
            name="minVideos"
            label="動画数 以上"
            type="number"
            min={0}
            defaultValue={filters.minVideos}
            placeholder="0"
          />
          <FilterInput
            id="channel-filter-posts-last30-rival"
            name="minPostsLast30"
            label="直近30日投稿 以上"
            type="number"
            min={0}
            defaultValue={filters.minPostsLast30}
            placeholder="0"
          />
          <FilterInput
            id="channel-filter-opportunity-rival"
            name="minOpportunityScore"
            label="参入魅力度 以上"
            type="number"
            min={0}
            max={100}
            defaultValue={filters.minOpportunityScore}
            placeholder="0"
          />
          <div className="grid gap-2">
            <Label htmlFor="channel-filter-sort-rival" className="text-xs font-medium text-slate-500">
              並び順
            </Label>
            <select
              id="channel-filter-sort-rival"
              name="sort"
              defaultValue={filters.sort}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            >
              {RIVAL_SORT_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {CHANNEL_SORT_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <FilterInput
            id="channel-filter-shorts-ratio-rival"
            name="maxShortsRatio"
            label="Shorts比率 以下 (%)"
            type="number"
            min={0}
            max={100}
            defaultValue={filters.maxShortsRatio}
            placeholder="100"
          />
          <FilterInput
            id="channel-filter-published-within-rival"
            name="publishedWithinDays"
            label="最新投稿日 何日以内"
            type="number"
            min={0}
            defaultValue={filters.publishedWithinDays}
            placeholder="0"
          />

          <div className="flex gap-3 md:col-span-2 xl:col-span-6 xl:justify-end">
            <Button type="submit" className="bg-blue-600 hover:bg-blue-500">
              検索
            </Button>
            <Button asChild variant="secondary">
              <Link href="/channels?mode=rival&sort=incomeHigh">リセット</Link>
            </Button>
          </div>
        </form>
      </div>
    </details>
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
    typeof params.sort === "string"
      ? baseFilters
      : baseFilters.mode === "rival"
        ? { ...baseFilters, sort: "incomeHigh" as const }
        : { ...baseFilters, sort: "contactPriority" as const };
  const data = await getChannelList(filters, { includeAutoScanIds: true });
  const rivalSummary = filters.mode === "rival" ? buildRivalSummary(data.items, data.total) : null;

  const actions = (
    <div className="flex flex-wrap items-center gap-3">
      <ModeTabs currentMode={filters.mode} />
      <Button asChild>
        <a href={`/api/export/csv?${toQueryString(filters, { page: 1 })}`}>CSV出力</a>
      </Button>
    </div>
  );

  return (
    <AppShell
      title={filters.mode === "sales" ? "一覧管理" : undefined}
      description={
        filters.mode === "sales"
          ? "保存済みのチャンネルを確認しながら、営業対象の整理と詳細確認を進められます。"
          : undefined
      }
      actions={filters.mode === "sales" ? actions : undefined}
    >
      {filters.mode === "rival" ? (
        <>
          <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-500">ライバル調査</p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">検索結果一覧</h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-500">
                想定月収、平均視聴回数、投稿頻度を比較しやすい一覧です。必要な条件だけフィルタを開いて絞り込めます。
              </p>
            </div>
            {actions}
          </section>

          {rivalSummary ? (
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="border-l-4 border-blue-500 pl-4">
                  <p className="text-sm text-slate-500">登録チャンネル数</p>
                  <p className="mt-3 text-5xl font-semibold tracking-tight text-slate-950">
                    {formatNumber(rivalSummary.totalChannels)}
                  </p>
                  <p className="mt-2 text-sm text-emerald-600">現在の絞り込み結果</p>
                </div>
              </div>
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-500">平均登録者数</p>
                <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                  {formatCompactNumber(rivalSummary.averageSubscribers)}
                </p>
                <p className="mt-2 text-sm text-emerald-600">表示中チャンネル平均</p>
              </div>
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-500">平均視聴回数</p>
                <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                  {formatCompactNumber(rivalSummary.averageViews)}
                </p>
                <p className="mt-2 text-sm text-emerald-600">直近10本の平均値ベース</p>
              </div>
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-500">平均想定月収</p>
                <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                  {formatCurrencyYen(rivalSummary.averageIncome)}
                </p>
                <p className="mt-2 text-sm text-emerald-600">base 推定の平均</p>
              </div>
            </section>
          ) : null}

          <RivalFilters filters={filters} />
        </>
      ) : (
        <SalesResultsClient data={data} filters={filters} currentQueryString={toQueryString(filters)}>
          <SalesFilters filters={filters} />
        </SalesResultsClient>
      )}

      {data.lockedCount > 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950">無料版の表示上限に達しました</p>
              <p className="mt-1 text-sm text-slate-500">
                取得件数は {data.total} 件ありますが、無料版では先頭 10 件まで表示されます。
              </p>
            </div>
            <UpgradeDialog triggerLabel="有料版で全件表示" />
          </CardContent>
        </Card>
      ) : null}

      {filters.mode === "sales" ? null : (
        <ChannelsTableClient
          initialItems={data.items}
          initialStats={data.stats}
          lockedCount={data.lockedCount}
          plan={data.plan}
          mode={filters.mode}
          totalCount={data.total}
          currentSort={filters.sort}
          currentQueryString={toQueryString(filters)}
          autoScanIds={data.autoScanIds}
          initialAutoScanStatus={data.autoScanStatus}
        />
      )}

      {data.plan === "PRO" && data.totalPages > 1 ? (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
          <p className="text-sm text-slate-500">
            {data.page} / {data.totalPages} ページ
          </p>
          <div className="flex gap-3">
            <Button
              asChild
              variant="secondary"
              size="sm"
              className={data.page <= 1 ? "pointer-events-none opacity-40" : ""}
            >
              <Link href={`/channels?${toQueryString(filters, { page: Math.max(1, data.page - 1) })}`}>前へ</Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              size="sm"
              className={data.page >= data.totalPages ? "pointer-events-none opacity-40" : ""}
            >
              <Link href={`/channels?${toQueryString(filters, { page: Math.min(data.totalPages, data.page + 1) })}`}>
                次へ
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
