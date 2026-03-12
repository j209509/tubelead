"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpDown, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  BestContactBadge,
  ChannelStatusBadge,
  ContactTypeBadge,
  EnrichmentStatusBadge,
} from "@/components/channels/channel-badges";
import { UpgradeDialog } from "@/components/channels/upgrade-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SerializedChannel } from "@/lib/channel-types";
import type { AppModeValue, AppPlanValue, ChannelSortValue } from "@/lib/constants";
import { getPostingFrequencyRank } from "@/lib/rival-analysis";
import {
  cn,
  formatCurrencyYen,
  formatDateTime,
  formatNumber,
  formatPercent,
  truncate,
} from "@/lib/utils";

type AutoScanStatus = {
  targetCount: number;
  completedCount: number;
  pendingCount: number;
  processingCount: number;
  failedCount: number;
};

type ChannelsTableClientProps = {
  initialItems: SerializedChannel[];
  lockedCount: number;
  plan: AppPlanValue;
  mode: AppModeValue;
  totalCount: number;
  currentSort: ChannelSortValue;
  currentQueryString: string;
  autoScanIds: string[];
  initialAutoScanStatus: AutoScanStatus | null;
};

type RowPatch = Partial<
  Pick<
    SerializedChannel,
    "lightEnrichmentStatus" | "lightEnrichmentUpdatedAt" | "deepEnrichmentStatus" | "deepEnrichmentUpdatedAt"
  >
>;

const AUTO_RIVAL_LIGHT_CONCURRENCY = 4;

async function runTasksWithConcurrency<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
  concurrency: number,
) {
  let cursor = 0;
  const workerCount = Math.max(1, Math.min(concurrency, items.length));

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        const item = items[index];

        if (item === undefined) {
          return;
        }

        await worker(item);
      }
    }),
  );
}

function GlobalSortHeader({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-1 py-1 text-left transition hover:text-slate-900",
        active ? "text-slate-900" : "text-slate-500",
      )}
    >
      <span>{label}</span>
      <ArrowUpDown className="h-3.5 w-3.5" />
      {active ? <span className="text-[11px] text-slate-400">全件順</span> : null}
    </button>
  );
}

function getRivalStatusMeta(status: AutoScanStatus | null, totalCount: number) {
  if (!status) {
    return {
      tone: "slate" as const,
      label: "準備中",
      description: `対象 ${formatNumber(totalCount)} 件の進捗を読み込み中です。`,
    };
  }

  if (status.targetCount === 0) {
    return {
      tone: "slate" as const,
      label: "対象なし",
      description: "この条件に一致するチャンネルはありません。",
    };
  }

  if (status.pendingCount === 0 && status.processingCount === 0 && status.failedCount === 0) {
    return {
      tone: "green" as const,
      label: "調査完了",
      description: `全 ${formatNumber(status.targetCount)} 件の推定月収補完が完了しました。`,
    };
  }

  if (status.pendingCount === 0 && status.processingCount === 0 && status.failedCount > 0) {
    return {
      tone: "amber" as const,
      label: "一部失敗",
      description: `${formatNumber(status.completedCount)} 件完了 / ${formatNumber(status.failedCount)} 件は再取得待ちです。`,
    };
  }

  return {
    tone: "blue" as const,
    label: "調査中",
    description: `${formatNumber(status.completedCount)} / ${formatNumber(status.targetCount)} 件完了。残り ${formatNumber(
      status.pendingCount + status.processingCount + status.failedCount,
    )} 件を補完中です。`,
  };
}

export function ChannelsTableClient({
  initialItems,
  lockedCount,
  plan,
  mode,
  totalCount,
  currentSort,
  currentQueryString,
  autoScanIds,
  initialAutoScanStatus,
}: ChannelsTableClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [rows, setRows] = useState(initialItems);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lightLoadingIds, setLightLoadingIds] = useState<string[]>([]);
  const [deepLoadingIds, setDeepLoadingIds] = useState<string[]>([]);
  const [bulkLightLoading, setBulkLightLoading] = useState(false);
  const [bulkDeepLoading, setBulkDeepLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [remainingAutoScanIds, setRemainingAutoScanIds] = useState(autoScanIds);
  const [autoScanStatus, setAutoScanStatus] = useState<AutoScanStatus | null>(initialAutoScanStatus);
  const autoQueuedRef = useRef<Set<string>>(new Set());
  const syncTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setRows(initialItems);
    setSelectedIds([]);
    setLightLoadingIds([]);
    setDeepLoadingIds([]);
    setBulkLightLoading(false);
    setBulkDeepLoading(false);
    setActionError("");
    setRemainingAutoScanIds(autoScanIds);
    setAutoScanStatus(initialAutoScanStatus);
    autoQueuedRef.current = new Set();
  }, [autoScanIds, currentQueryString, initialAutoScanStatus, initialItems]);

  useEffect(() => {
    return () => {
      if (syncTimerRef.current) {
        window.clearTimeout(syncTimerRef.current);
      }
    };
  }, []);

  const isSales = mode === "sales";
  const columnCount = isSales ? 18 : 20;
  const allVisibleSelected = rows.length > 0 && selectedIds.length === rows.length;

  const visibleSummary = useMemo(
    () => ({
      basicReadyCount: rows.filter((row) => row.basicFetchedAt).length,
      lightCompletedCount: rows.filter((row) => row.lightEnrichmentStatus === "COMPLETED").length,
      lightPendingCount: rows.filter((row) => row.lightEnrichmentStatus === "PENDING").length,
      lightProcessingCount: rows.filter((row) => row.lightEnrichmentStatus === "PROCESSING").length,
      deepCompletedCount: rows.filter((row) => row.deepEnrichmentStatus === "COMPLETED").length,
    }),
    [rows],
  );

  const rivalStatusMeta = useMemo(() => getRivalStatusMeta(autoScanStatus, totalCount), [autoScanStatus, totalCount]);

  const syncVisiblePage = useCallback(async () => {
    const response = await fetch(`/api/channels?${currentQueryString}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as {
      items?: SerializedChannel[];
      autoScanIds?: string[];
      autoScanStatus?: AutoScanStatus | null;
    };

    if (!Array.isArray(data.items)) {
      return;
    }

    setRows(data.items);
    setSelectedIds((current) => current.filter((id) => data.items?.some((row) => row.id === id)));
    setRemainingAutoScanIds(Array.isArray(data.autoScanIds) ? data.autoScanIds : []);
    setAutoScanStatus(data.autoScanStatus ?? null);
  }, [currentQueryString]);

  const scheduleVisiblePageSync = useCallback(() => {
    if (mode !== "rival") {
      return;
    }

    if (syncTimerRef.current) {
      window.clearTimeout(syncTimerRef.current);
    }

    syncTimerRef.current = window.setTimeout(() => {
      void syncVisiblePage();
    }, 700);
  }, [mode, syncVisiblePage]);

  const replaceRow = useCallback((next: SerializedChannel) => {
    setRows((current) => current.map((row) => (row.id === next.id ? next : row)));
  }, []);

  const patchRow = useCallback((channelId: string, patch: RowPatch) => {
    setRows((current) =>
      current.map((row) =>
        row.id === channelId
          ? {
              ...row,
              ...patch,
            }
          : row,
      ),
    );
  }, []);

  const runLightScan = useCallback(
    async (channelId: string) => {
      setActionError("");
      setLightLoadingIds((current) => (current.includes(channelId) ? current : [...current, channelId]));
      patchRow(channelId, {
        lightEnrichmentStatus: "PROCESSING",
        lightEnrichmentUpdatedAt: new Date().toISOString(),
      });

      try {
        const response = await fetch(`/api/channels/${channelId}/scan-videos`, {
          method: "POST",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "動画分析の取得に失敗しました。");
        }

        if (data.channel) {
          replaceRow(data.channel as SerializedChannel);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "動画分析の取得に失敗しました。";
        setActionError(message);
        patchRow(channelId, {
          lightEnrichmentStatus: "FAILED",
          lightEnrichmentUpdatedAt: new Date().toISOString(),
        });
      } finally {
        setLightLoadingIds((current) => current.filter((id) => id !== channelId));
        scheduleVisiblePageSync();
      }
    },
    [patchRow, replaceRow, scheduleVisiblePageSync],
  );

  const runDeepScan = useCallback(
    async (channelId: string) => {
      setActionError("");
      setDeepLoadingIds((current) => (current.includes(channelId) ? current : [...current, channelId]));
      patchRow(channelId, {
        deepEnrichmentStatus: "PROCESSING",
        deepEnrichmentUpdatedAt: new Date().toISOString(),
      });

      try {
        const response = await fetch(`/api/channels/${channelId}/scan-external`, {
          method: "POST",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "外部サイトの詳細取得に失敗しました。");
        }

        if (data.channel) {
          replaceRow(data.channel as SerializedChannel);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "外部サイトの詳細取得に失敗しました。";
        setActionError(message);
        patchRow(channelId, {
          deepEnrichmentStatus: "FAILED",
          deepEnrichmentUpdatedAt: new Date().toISOString(),
        });
      } finally {
        setDeepLoadingIds((current) => current.filter((id) => id !== channelId));
      }
    },
    [patchRow, replaceRow],
  );

  useEffect(() => {
    if (mode !== "rival") {
      return;
    }

    const availableSlots = Math.max(0, AUTO_RIVAL_LIGHT_CONCURRENCY - lightLoadingIds.length);
    if (availableSlots === 0) {
      return;
    }

    const nextIds = remainingAutoScanIds
      .filter((id) => !autoQueuedRef.current.has(id))
      .slice(0, availableSlots);

    if (nextIds.length === 0) {
      return;
    }

    nextIds.forEach((channelId) => {
      autoQueuedRef.current.add(channelId);
      void runLightScan(channelId);
    });
  }, [lightLoadingIds.length, mode, remainingAutoScanIds, runLightScan]);

  async function handleBulkLightScan() {
    const targets = selectedIds.filter((id) => !lightLoadingIds.includes(id));
    if (targets.length === 0 || bulkLightLoading) {
      return;
    }

    setBulkLightLoading(true);
    try {
      await runTasksWithConcurrency(targets, runLightScan, 2);
    } finally {
      setBulkLightLoading(false);
    }
  }

  async function handleBulkDeepScan() {
    const targets = selectedIds.filter((id) => !deepLoadingIds.includes(id));
    if (targets.length === 0 || bulkDeepLoading) {
      return;
    }

    setBulkDeepLoading(true);
    try {
      await runTasksWithConcurrency(targets, runDeepScan, 2);
    } finally {
      setBulkDeepLoading(false);
    }
  }

  function toggleSelection(channelId: string) {
    setSelectedIds((current) =>
      current.includes(channelId) ? current.filter((id) => id !== channelId) : [...current, channelId],
    );
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? rows.map((row) => row.id) : []);
  }

  function pushGlobalSort(sort: ChannelSortValue) {
    const params = new URLSearchParams(currentQueryString);
    params.set("sort", sort);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          {isSales ? (
            <>
              <p className="text-sm font-medium text-slate-900">
                検索直後は基本情報のみを表示し、あとから動画抽出と連絡先の補完を進めます。
              </p>
              <p className="text-xs text-slate-500">
                基本取得済み {formatNumber(visibleSummary.basicReadyCount)} 件 / 動画走査済み{" "}
                {formatNumber(visibleSummary.lightCompletedCount)} 件 / 走査待ち{" "}
                {formatNumber(visibleSummary.lightPendingCount)} 件 / 走査中{" "}
                {formatNumber(visibleSummary.lightProcessingCount)} 件 / 外部走査済み{" "}
                {formatNumber(visibleSummary.deepCompletedCount)} 件
              </p>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={rivalStatusMeta.tone}>{rivalStatusMeta.label}</Badge>
                <p className="text-sm font-medium text-slate-900">{rivalStatusMeta.description}</p>
              </div>
              <p className="text-xs text-slate-500">
                フィルタ一致 {formatNumber(totalCount)} 件。推定月収や直近動画指標は、取得できた行から順次一覧へ反映されます。
              </p>
              {autoScanStatus ? (
                <p className="text-xs text-slate-500">
                  完了 {formatNumber(autoScanStatus.completedCount)} 件 / 処理中{" "}
                  {formatNumber(autoScanStatus.processingCount)} 件 / 待機{" "}
                  {formatNumber(autoScanStatus.pendingCount)} 件 / 失敗{" "}
                  {formatNumber(autoScanStatus.failedCount)} 件
                </p>
              ) : null}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isSales ? (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void handleBulkLightScan()}
                disabled={selectedIds.length === 0 || bulkLightLoading}
              >
                <RefreshCw className={cn("mr-2 h-4 w-4", bulkLightLoading && "animate-spin")} />
                {bulkLightLoading ? "動画抽出中..." : `選択行を動画抽出 (${selectedIds.length})`}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleBulkDeepScan()}
                disabled={selectedIds.length === 0 || bulkDeepLoading}
              >
                <RefreshCw className={cn("mr-2 h-4 w-4", bulkDeepLoading && "animate-spin")} />
                {bulkDeepLoading ? "詳細走査中..." : `選択行を詳細走査 (${selectedIds.length})`}
              </Button>
            </>
          ) : (
            <p className="text-xs text-slate-500">並び替え: {currentSort}</p>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds([])}
            disabled={selectedIds.length === 0}
          >
            選択解除
          </Button>
        </div>
      </div>

      {actionError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {actionError}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white/80">
        <table className={cn("divide-y divide-slate-200 text-sm", isSales ? "min-w-[1900px]" : "min-w-[2200px]")}>
          <thead className="bg-slate-50/80 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={allVisibleSelected}
                  onChange={(event) => toggleAll(event.target.checked)}
                />
              </th>
              <th className="px-4 py-3 font-medium">サムネイル</th>
              <th className="px-4 py-3 font-medium">チャンネル名</th>
              <th className="px-4 py-3 font-medium">
                {isSales ? (
                  "登録者数"
                ) : (
                  <GlobalSortHeader
                    label="登録者数"
                    active={currentSort === "subscribers"}
                    onClick={() => pushGlobalSort("subscribers")}
                  />
                )}
              </th>
              <th className="px-4 py-3 font-medium">動画数</th>
              {isSales ? (
                <>
                  <th className="px-4 py-3 font-medium">カテゴリ</th>
                  <th className="px-4 py-3 font-medium">地域</th>
                  <th className="px-4 py-3 font-medium">連絡先種別</th>
                  <th className="px-4 py-3 font-medium">bestContact</th>
                  <th className="px-4 py-3 font-medium">連絡先</th>
                  <th className="px-4 py-3 font-medium">sourceQueries</th>
                  <th className="px-4 py-3 font-medium">連絡可能性</th>
                  <th className="px-4 py-3 font-medium">取得状態</th>
                  <th className="px-4 py-3 font-medium">動画走査本数</th>
                  <th className="px-4 py-3 font-medium">ステータス</th>
                  <th className="px-4 py-3 font-medium">タグ</th>
                  <th className="px-4 py-3 font-medium">メモ</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </>
              ) : (
                <>
                  <th className="px-4 py-3 font-medium">
                    <GlobalSortHeader label="総再生数" active={currentSort === "views"} onClick={() => pushGlobalSort("views")} />
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <GlobalSortHeader
                      label="想定月収"
                      active={currentSort === "incomeHigh"}
                      onClick={() => pushGlobalSort("incomeHigh")}
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <GlobalSortHeader
                      label="直近10本平均"
                      active={currentSort === "avgViews"}
                      onClick={() => pushGlobalSort("avgViews")}
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">直近10本中央値</th>
                  <th className="px-4 py-3 font-medium">
                    <GlobalSortHeader
                      label="直近30日投稿"
                      active={currentSort === "posts30"}
                      onClick={() => pushGlobalSort("posts30")}
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">投稿頻度</th>
                  <th className="px-4 py-3 font-medium">再生/登録者比</th>
                  <th className="px-4 py-3 font-medium">Shorts率</th>
                  <th className="px-4 py-3 font-medium">
                    <GlobalSortHeader
                      label="最新投稿日"
                      active={currentSort === "latestVideo"}
                      onClick={() => pushGlobalSort("latestVideo")}
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <GlobalSortHeader
                      label="推定月間再生数"
                      active={currentSort === "monthlyViews"}
                      onClick={() => pushGlobalSort("monthlyViews")}
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">競合度</th>
                  <th className="px-4 py-3 font-medium">成長性</th>
                  <th className="px-4 py-3 font-medium">参入魅力度</th>
                  <th className="px-4 py-3 font-medium">取得状態</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 bg-white/70">
            {rows.map((channel) => {
              const isLightLoading = lightLoadingIds.includes(channel.id);
              const isDeepLoading = deepLoadingIds.includes(channel.id);
              const viewsPerSub =
                channel.subscriberCount > 0 && channel.avgViewsLast10
                  ? channel.avgViewsLast10 / channel.subscriberCount
                  : 0;

              return (
                <tr key={channel.id} className="align-top">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={selectedIds.includes(channel.id)}
                      onChange={() => toggleSelection(channel.id)}
                    />
                  </td>

                  <td className="px-4 py-4">
                    <img
                      src={channel.thumbnailUrl || "https://placehold.co/64x64/e2e8f0/0f172a?text=TL"}
                      alt={channel.title}
                      className="h-12 w-12 rounded-2xl object-cover"
                    />
                  </td>

                  <td className="px-4 py-4">
                    <div className="max-w-[260px] space-y-1">
                      <p className="font-medium text-slate-900">{channel.title}</p>
                      <p className="text-xs text-slate-500">{truncate(channel.sourceQuery, 48)}</p>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-slate-700">{formatNumber(channel.subscriberCount)}</td>
                  <td className="px-4 py-4 text-slate-700">{formatNumber(channel.videoCount)}</td>
                  {isSales ? (
                    <>
                      <td className="px-4 py-4 text-slate-700">{channel.categoryGuess || "-"}</td>
                      <td className="px-4 py-4 text-slate-700">{channel.regionGuess || "-"}</td>
                      <td className="px-4 py-4">
                        <ContactTypeBadge contactType={channel.contactType} />
                      </td>
                      <td className="px-4 py-4">
                        <BestContactBadge method={channel.bestContactMethod} />
                      </td>
                      <td className="px-4 py-4">
                        <p className="max-w-[220px] break-all text-slate-700">{channel.bestContactValue || "-"}</p>
                      </td>
                      <td className="px-4 py-4 text-slate-700">{formatNumber(channel.sourceQueries.length)} 件</td>
                      <td className="px-4 py-4 text-slate-900">{formatNumber(channel.contactabilityScore)}</td>
                      <td className="px-4 py-4">
                        <div className="flex max-w-[220px] flex-wrap gap-2">
                          <EnrichmentStatusBadge status={channel.basicFetchedAt ? "COMPLETED" : "IDLE"} label="基本" />
                          <EnrichmentStatusBadge status={channel.lightEnrichmentStatus} label="動画" />
                          <EnrichmentStatusBadge status={channel.deepEnrichmentStatus} label="外部" />
                        </div>
                        <div className="mt-2 space-y-1 text-xs text-slate-500">
                          <p>基本: {formatDateTime(channel.basicFetchedAt)}</p>
                          <p>動画: {formatDateTime(channel.lightEnrichmentUpdatedAt)}</p>
                          <p>外部: {formatDateTime(channel.deepEnrichmentUpdatedAt)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-700">{formatNumber(channel.latestVideoScanCount)} 本</td>
                      <td className="px-4 py-4">
                        <ChannelStatusBadge status={channel.status} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex max-w-[180px] flex-wrap gap-1 text-xs text-slate-600">
                          {channel.tags.length > 0 ? channel.tags.map((tag) => <span key={tag}>#{tag}</span>) : <span>-</span>}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="max-w-[220px] whitespace-pre-wrap break-words text-slate-600">
                          {truncate(channel.note || "-", 80)}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => void runLightScan(channel.id)}
                            disabled={isLightLoading}
                          >
                            <RefreshCw className={cn("mr-2 h-4 w-4", isLightLoading && "animate-spin")} />
                            {isLightLoading
                              ? "動画抽出中..."
                              : channel.lightEnrichmentStatus === "COMPLETED"
                                ? "動画抽出を再実行"
                                : "動画抽出"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void runDeepScan(channel.id)}
                            disabled={isDeepLoading}
                          >
                            <RefreshCw className={cn("mr-2 h-4 w-4", isDeepLoading && "animate-spin")} />
                            {isDeepLoading ? "詳細走査中..." : "連絡先詳細検索"}
                          </Button>
                          <Button asChild size="sm" variant="ghost">
                            <Link href={`/channels/${channel.id}?mode=${mode}`}>詳細を見る</Link>
                          </Button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-4 text-slate-700">{formatNumber(channel.viewCount)}</td>
                      <td className="px-4 py-4">
                        <div className="min-w-[250px] rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-[11px] text-slate-500">low</p>
                              <p className="text-sm font-semibold text-slate-900">
                                {formatCurrencyYen(channel.estimatedMonthlyIncomeLow)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] text-slate-500">base</p>
                              <p className="text-sm font-semibold text-slate-950">
                                {formatCurrencyYen(channel.estimatedMonthlyIncomeBase)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] text-slate-500">high</p>
                              <p className="text-sm font-semibold text-emerald-700">
                                {formatCurrencyYen(channel.estimatedMonthlyIncomeHigh)}
                              </p>
                            </div>
                          </div>
                          <p className="mt-2 text-[11px] text-slate-500">
                            推定値です。実収益を保証するものではありません。
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-900">{formatNumber(channel.avgViewsLast10)}</td>
                      <td className="px-4 py-4 text-slate-700">{formatNumber(channel.medianViewsLast10)}</td>
                      <td className="px-4 py-4 text-slate-700">{formatNumber(channel.postsLast30)}</td>
                      <td className="px-4 py-4 text-slate-700">{getPostingFrequencyRank(channel.postsLast30)}</td>
                      <td className="px-4 py-4 text-slate-700">{viewsPerSub ? `${viewsPerSub.toFixed(2)}x` : "-"}</td>
                      <td className="px-4 py-4 text-slate-700">{formatPercent(channel.shortsRatio, 0)}</td>
                      <td className="px-4 py-4 text-slate-700">{formatDateTime(channel.lastVideoPublishedAt)}</td>
                      <td className="px-4 py-4 text-slate-900">{formatNumber(channel.monthlyViewsEstimate)}</td>
                      <td className="px-4 py-4 text-slate-900">{formatNumber(channel.competitionScore)}</td>
                      <td className="px-4 py-4 text-slate-900">{formatNumber(channel.growthScore)}</td>
                      <td className="px-4 py-4 text-slate-900">{formatNumber(channel.opportunityScore)}</td>
                      <td className="px-4 py-4">
                        <div className="flex max-w-[220px] flex-wrap gap-2">
                          <EnrichmentStatusBadge status={channel.basicFetchedAt ? "COMPLETED" : "IDLE"} label="基本" />
                          <EnrichmentStatusBadge status={channel.lightEnrichmentStatus} label="分析" />
                          <EnrichmentStatusBadge status={channel.deepEnrichmentStatus} label="外部" />
                        </div>
                        <div className="mt-2 space-y-1 text-xs text-slate-500">
                          <p>基本: {formatDateTime(channel.basicFetchedAt)}</p>
                          <p>分析: {formatDateTime(channel.lightEnrichmentUpdatedAt)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2">
                          <Button asChild size="sm" variant="ghost">
                            <Link href={`/channels/${channel.id}?mode=${mode}`}>詳細を見る</Link>
                          </Button>
                          {channel.lightEnrichmentStatus === "FAILED" ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => void runLightScan(channel.id)}
                              disabled={isLightLoading}
                            >
                              <RefreshCw className={cn("mr-2 h-4 w-4", isLightLoading && "animate-spin")} />
                              {isLightLoading ? "再取得中..." : "再取得"}
                            </Button>
                          ) : null}
                          {isLightLoading ? <p className="text-xs text-blue-600">この行を分析中です...</p> : null}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}

            {lockedCount > 0
              ? Array.from({ length: Math.min(3, lockedCount) }).map((_, index) => (
                  <tr key={`locked-${index}`} className="opacity-70">
                    <td className="px-4 py-4" colSpan={columnCount}>
                      <div className="flex items-center justify-between rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4">
                        <div className="blur-[3px]">11件目以降のチャンネルは無料プランではロック表示です。</div>
                        {plan === "FREE" ? <UpgradeDialog triggerLabel="ロックを解除" /> : null}
                      </div>
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
