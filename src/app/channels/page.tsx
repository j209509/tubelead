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
  { key: "totalChannels", label: "表示対象件数" },
  { key: "emailCount", label: "email あり件数" },
  { key: "formCount", label: "form あり件数" },
  { key: "socialCount", label: "social link あり件数" },
  { key: "officialSiteCount", label: "official site あり件数" },
  { key: "bestEmailCount", label: "bestContact=email" },
  { key: "bestFormCount", label: "bestContact=form" },
] as const;

function ModeTabs({ currentMode }: { currentMode: AppModeValue }) {
  return (
    <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1">
      {(["sales", "rival"] as const).map((mode) => {
        const active = currentMode === mode;
        return (
          <Link
            key={mode}
            href={`/channels?${toQueryString({ ...DEFAULT_FILTERS, mode }, { mode })}`}
            className={
              active
                ? "rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                : "rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
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
      title={filters.mode === "rival" ? "ライバル調査一覧" : "営業リスト一覧"}
      description={
        filters.mode === "rival"
          ? "想定月収、投稿頻度、再生効率、Shorts依存度を比較しやすい一覧です。検索直後は基本情報を表示し、動画分析は後から順次反映されます。"
          : "検索後のチャンネルを営業リストとして整理できます。基本取得後に動画補完が順次進み、必要な行だけ外部サイトの詳細走査を実行できます。"
      }
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <ModeTabs currentMode={filters.mode} />
          <Button asChild>
            <a href={`/api/export/csv?${toQueryString(filters, { page: 1 })}`}>CSV出力</a>
          </Button>
        </div>
      }
    >
      {filters.mode === "rival" && rivalSummary ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-slate-500">該当チャンネル数</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{formatNumber(rivalSummary.totalChannels)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-slate-500">想定月収中央値</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">
                {formatCurrencyYen(rivalSummary.medianMonthlyIncomeBase)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-slate-500">高頻度投稿チャンネル</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{formatNumber(rivalSummary.highPostingCount)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-slate-500">Shorts主体チャンネル</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{formatNumber(rivalSummary.shortsHeavyCount)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-slate-500">参入魅力度が高い件数</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">
                {formatNumber(rivalSummary.highOpportunityCount)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-slate-500">想定月収 high 順ランキング</p>
              <div className="mt-3 space-y-2">
                {rivalSummary.topIncomeChannels.length > 0 ? (
                  rivalSummary.topIncomeChannels.map((channel, index) => (
                    <div key={channel.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-600">
                        {index + 1}. {channel.title}
                      </span>
                      <span className="font-medium text-slate-950">
                        {formatCompactNumber(channel.estimatedMonthlyIncomeHigh)}円
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">分析待ちです。</p>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          {salesSummaryCards.map((card) => (
            <Card key={card.key}>
              <CardContent className="p-6">
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="mt-3 text-3xl font-semibold text-slate-950">
                  {formatNumber(data.stats[card.key as keyof typeof data.stats])}
                </p>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      <Card>
        <CardHeader>
          <CardTitle>フィルタ</CardTitle>
          <CardDescription>
            {filters.mode === "rival"
              ? "ライバル調査モードでは分析指標を中心に絞り込みます。"
              : "営業モードでは連絡可能性と補完状況を中心に絞り込みます。"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-6" method="GET">
            <input type="hidden" name="page" value="1" />
            <input type="hidden" name="mode" value={filters.mode} />
            <div className="grid gap-2 xl:col-span-2">
              <Label htmlFor="channel-filter-q">キーワード / チャンネル名</Label>
              <input
                id="channel-filter-q"
                name="q"
                defaultValue={filters.q}
                placeholder="チャンネル名、カテゴリ、sourceQuery で検索"
                className="h-11 rounded-xl border border-slate-200 bg-white/90 px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="channel-filter-source-query">検索ソース語</Label>
              <input
                id="channel-filter-source-query"
                name="sourceQuery"
                defaultValue={filters.sourceQuery}
                placeholder="sourceQueries を含む語"
                className="h-11 rounded-xl border border-slate-200 bg-white/90 px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="channel-filter-min-subscribers">最低登録者数</Label>
              <input
                id="channel-filter-min-subscribers"
                name="minSubscribers"
                type="number"
                min={0}
                defaultValue={filters.minSubscribers}
                placeholder="登録者数以上"
                className="h-11 rounded-xl border border-slate-200 bg-white/90 px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="channel-filter-min-videos">最低動画数</Label>
              <input
                id="channel-filter-min-videos"
                name="minVideos"
                type="number"
                min={0}
                defaultValue={filters.minVideos}
                placeholder="総動画数以上"
                className="h-11 rounded-xl border border-slate-200 bg-white/90 px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            {filters.mode === "rival" ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="channel-filter-min-avg-views">直近10本平均再生数 以上</Label>
                  <input
                    id="channel-filter-min-avg-views"
                    name="minAvgViewsLast10"
                    type="number"
                    min={0}
                    defaultValue={filters.minAvgViewsLast10}
                    placeholder="直近平均再生以上"
                    className="h-11 rounded-xl border border-slate-200 bg-white/90 px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="channel-filter-income-base">想定月収 base 以上</Label>
                  <input
                    id="channel-filter-income-base"
                    name="minEstimatedMonthlyIncomeBase"
                    type="number"
                    min={0}
                    defaultValue={filters.minEstimatedMonthlyIncomeBase}
                    placeholder="想定月収 base 以上"
                    className="h-11 rounded-xl border border-slate-200 bg-white/90 px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="channel-filter-posts-last30">直近30日投稿本数 以上</Label>
                  <input
                    id="channel-filter-posts-last30"
                    name="minPostsLast30"
                    type="number"
                    min={0}
                    defaultValue={filters.minPostsLast30}
                    placeholder="直近30日投稿本数以上"
                    className="h-11 rounded-xl border border-slate-200 bg-white/90 px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="channel-filter-opportunity">参入魅力度 以上</Label>
                  <input
                    id="channel-filter-opportunity"
                    name="minOpportunityScore"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={filters.minOpportunityScore}
                    placeholder="参入魅力度以上"
                    className="h-11 rounded-xl border border-slate-200 bg-white/90 px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="channel-filter-contactability">連絡可能性スコア 以上</Label>
                  <input
                    id="channel-filter-contactability"
                    name="minContactabilityScore"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={filters.minContactabilityScore}
                    placeholder="連絡可能性以上"
                    className="h-11 rounded-xl border border-slate-200 bg-white/90 px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="channel-filter-sort-sales">並び順</Label>
                  <select
                    id="channel-filter-sort-sales"
                    name="sort"
                    defaultValue={filters.sort}
                    className="h-11 rounded-xl border border-slate-200 bg-white/90 px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
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
                <div className="grid gap-2">
                  <Label htmlFor="channel-filter-sort-rival">並び順</Label>
                  <select
                    id="channel-filter-sort-rival"
                    name="sort"
                    defaultValue={filters.sort}
                    className="h-11 rounded-xl border border-slate-200 bg-white/90 px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  >
                    {Object.entries(CHANNEL_SORT_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="channel-filter-shorts-ratio">Shorts率 以下 (%)</Label>
                  <input
                    id="channel-filter-shorts-ratio"
                    name="maxShortsRatio"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={filters.maxShortsRatio}
                    placeholder="Shorts率 以下"
                    className="h-11 rounded-xl border border-slate-200 bg-white/90 px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="channel-filter-published-within">最新投稿日 何日以内</Label>
                  <input
                    id="channel-filter-published-within"
                    name="publishedWithinDays"
                    type="number"
                    min={0}
                    defaultValue={filters.publishedWithinDays}
                    placeholder="最新投稿日 ○日以内"
                    className="h-11 rounded-xl border border-slate-200 bg-white/90 px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </>
            ) : null}

            {filters.mode === "sales" ? (
              <>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                  <input type="checkbox" name="hasEmail" value="true" defaultChecked={filters.hasEmail} />
                  メールあり
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                  <input type="checkbox" name="hasForm" value="true" defaultChecked={filters.hasForm} />
                  フォームあり
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                  <input type="checkbox" name="hasSocial" value="true" defaultChecked={filters.hasSocial} />
                  SNSあり
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                  <input type="checkbox" name="hasOfficialSite" value="true" defaultChecked={filters.hasOfficialSite} />
                  外部サイトあり
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                  <input type="checkbox" name="hasVideoContact" value="true" defaultChecked={filters.hasVideoContact} />
                  動画概要欄から抽出あり
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                  <input type="checkbox" name="hasExternalContact" value="true" defaultChecked={filters.hasExternalContact} />
                  外部サイトから抽出あり
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                  <input type="checkbox" name="onlyUnreviewed" value="true" defaultChecked={filters.onlyUnreviewed} />
                  未確認のみ
                </label>
              </>
            ) : null}

            <div className="flex gap-3 md:col-span-2 xl:col-span-6 xl:justify-end">
              <Button type="submit">絞り込む</Button>
              <Button asChild variant="secondary">
                <Link href={`/channels?mode=${filters.mode}`}>リセット</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {data.lockedCount > 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950">無料版の表示上限に達しました</p>
              <p className="mt-1 text-sm text-slate-500">
                総件数は {data.total} 件ありますが、無料版では先頭 10 件まで表示されます。
              </p>
            </div>
            <UpgradeDialog triggerLabel="有料版で全件表示" />
          </CardContent>
        </Card>
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
              <Link href={`/channels?${toQueryString(filters, { page: Math.min(data.totalPages, data.page + 1) })}`}>次へ</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
