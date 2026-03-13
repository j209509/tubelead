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
        "inline-flex items-center gap-1 text-left text-xs transition hover:text-zinc-900",
        active ? "font-medium text-zinc-900" : "text-zinc-500",
      )}
    >
      <span>{label}</span>
      <ArrowUpDown className="h-3 w-3" />
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
    <div className="space-y-3">
      {/* ステータスバー */}
      <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          {isSales ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
              <span>基本 <strong className="text-zinc-700">{formatNumber(visibleSummary.basicReadyCount)}</strong></span>
              <span>動画走査 <strong className="text-zinc-700">{formatNumber(visibleSummary.lightCompletedCount)}</strong></span>
              <span>待機 <strong className="text-zinc-700">{formatNumber(visibleSummary.lightPendingCount)}</strong></span>
              <span>外部 <strong className="text-zinc-700">{formatNumber(visibleSummary.deepCompletedCount)}</strong></span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={rivalStatusMeta.tone}>{rivalStatusMeta.label}</Badge>
              <span className="text-xs text-zinc-600">{rivalStatusMeta.description}</span>
              {autoScanStatus ? (
                <span className="text-xs text-zinc-400">
                  (完了 {formatNumber(autoScanStatus.completedCount)} / 待機 {formatNumber(autoScanStatus.pendingCount)})
                </span>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isSales ? (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void handleBulkLightScan()}
                disabled={selectedIds.length === 0 || bulkLightLoading}
              >
                <RefreshCw className={cn("mr-1.5 h-3 w-3", bulkLightLoading && "animate-spin")} />
                {bulkLightLoading ? "抽出中..." : `動画抽出 (${selectedIds.length})`}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleBulkDeepScan()}
                disabled={selectedIds.length === 0 || bulkDeepLoading}
              >
                <RefreshCw className={cn("mr-1.5 h-3 w-3", bulkDeepLoading && "animate-spin")} />
                {bulkDeepLoading ? "走査中..." : `詳細走査 (${selectedIds.length})`}
              </Button>
            </>
          ) : null}

          {selectedIds.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
            >
              解除
            </Button>
          )}
        </div>
      </div>

      {actionError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {actionError}
        </div>
      ) : null}

      {/* テーブル */}
      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className={cn("w-full text-xs", isSales ? "min-w-[1600px]" : "min-w-[1800px]")}>
          <thead className="border-b border-zinc-100 bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="w-10 px-3 py-2">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-zinc-300"
                  checked={allVisibleSelected}
                  onChange={(event) => toggleAll(event.target.checked)}
                />
              </th>
              <th className="w-14 px-2 py-2"></th>
              <th className="min-w-[180px] px-2 py-2 font-medium">チャンネル</th>
              <th className="w-20 px-2 py-2 text-right font-medium">
                {isSales ? (
                  "登録者"
                ) : (
                  <GlobalSortHeader
                    label="登録者"
                    active={currentSort === "subscribers"}
                    onClick={() => pushGlobalSort("subscribers")}
                  />
                )}
              </th>
              <th className="w-16 px-2 py-2 text-right font-medium">動画数</th>
              {isSales ? (
                <>
                  <th className="w-20 px-2 py-2 font-medium">カテゴリ</th>
                  <th className="w-16 px-2 py-2 font-medium">地域</th>
                  <th className="w-20 px-2 py-2 font-medium">種別</th>
                  <th className="w-20 px-2 py-2 font-medium">優先</th>
                  <th className="min-w-[140px] px-2 py-2 font-medium">連絡先</th>
                  <th className="w-16 px-2 py-2 text-right font-medium">ソース</th>
                  <th className="w-16 px-2 py-2 text-right font-medium">可能性</th>
                  <th className="w-24 px-2 py-2 font-medium">状態</th>
                  <th className="w-16 px-2 py-2 text-right font-medium">走査数</th>
                  <th className="w-20 px-2 py-2 font-medium">ステータス</th>
                  <th className="min-w-[80px] px-2 py-2 font-medium">タグ</th>
                  <th className="min-w-[100px] px-2 py-2 font-medium">メモ</th>
                  <th className="w-28 px-2 py-2 font-medium">操作</th>
                </>
              ) : (
                <>
                  <th className="w-20 px-2 py-2 text-right font-medium">
                    <GlobalSortHeader label="総再生" active={currentSort === "views"} onClick={() => pushGlobalSort("views")} />
                  </th>
                  <th className="min-w-[160px] px-2 py-2 font-medium">
                    <GlobalSortHeader
                      label="想定月収"
                      active={currentSort === "incomeHigh"}
                      onClick={() => pushGlobalSort("incomeHigh")}
                    />
                  </th>
                  <th className="w-20 px-2 py-2 text-right font-medium">
                    <GlobalSortHeader
                      label="平均再生"
                      active={currentSort === "avgViews"}
                      onClick={() => pushGlobalSort("avgViews")}
                    />
                  </th>
                  <th className="w-20 px-2 py-2 text-right font-medium">中央値</th>
                  <th className="w-16 px-2 py-2 text-right font-medium">
                    <GlobalSortHeader
                      label="30日"
                      active={currentSort === "posts30"}
                      onClick={() => pushGlobalSort("posts30")}
                    />
                  </th>
                  <th className="w-16 px-2 py-2 font-medium">頻度</th>
                  <th className="w-16 px-2 py-2 text-right font-medium">効率</th>
                  <th className="w-16 px-2 py-2 text-right font-medium">Shorts</th>
                  <th className="w-20 px-2 py-2 font-medium">
                    <GlobalSortHeader
                      label="最新投稿"
                      active={currentSort === "latestVideo"}
                      onClick={() => pushGlobalSort("latestVideo")}
                    />
                  </th>
                  <th className="w-24 px-2 py-2 text-right font-medium">
                    <GlobalSortHeader
                      label="月間再生"
                      active={currentSort === "monthlyViews"}
                      onClick={() => pushGlobalSort("monthlyViews")}
                    />
                  </th>
                  <th className="w-14 px-2 py-2 text-right font-medium">競合</th>
                  <th className="w-14 px-2 py-2 text-right font-medium">成長</th>
                  <th className="w-14 px-2 py-2 text-right font-medium">魅力度</th>
                  <th className="w-20 px-2 py-2 font-medium">状態</th>
                  <th className="w-24 px-2 py-2 font-medium">操作</th>
                </>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-100">
            {rows.map((channel) => {
              const isLightLoading = lightLoadingIds.includes(channel.id);
              const isDeepLoading = deepLoadingIds.includes(channel.id);
              const viewsPerSub =
                channel.subscriberCount > 0 && channel.avgViewsLast10
                  ? channel.avgViewsLast10 / channel.subscriberCount
                  : 0;

              return (
                <tr key={channel.id} className="align-top transition-colors hover:bg-zinc-50">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-zinc-300"
                      checked={selectedIds.includes(channel.id)}
                      onChange={() => toggleSelection(channel.id)}
                    />
                  </td>

                  <td className="px-2 py-2">
                    <img
                      src={channel.thumbnailUrl || "https://placehold.co/40x40/e4e4e7/71717a?text=CH"}
                      alt={channel.title}
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  </td>

                  <td className="px-2 py-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-zinc-900">{channel.title}</p>
                      <p className="truncate text-zinc-400">{truncate(channel.sourceQuery, 32)}</p>
                    </div>
                  </td>

                  <td className="px-2 py-2 text-right tabular-nums text-zinc-700">{formatNumber(channel.subscriberCount)}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-zinc-700">{formatNumber(channel.videoCount)}</td>
                  {isSales ? (
                    <>
                      <td className="px-2 py-2 text-zinc-600">{channel.categoryGuess || "-"}</td>
                      <td className="px-2 py-2 text-zinc-600">{channel.regionGuess || "-"}</td>
                      <td className="px-2 py-2">
                        <ContactTypeBadge contactType={channel.contactType} />
                      </td>
                      <td className="px-2 py-2">
                        <BestContactBadge method={channel.bestContactMethod} />
                      </td>
                      <td className="px-2 py-2">
                        <p className="max-w-[140px] truncate text-zinc-700">{channel.bestContactValue || "-"}</p>
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-zinc-600">{formatNumber(channel.sourceQueries.length)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-zinc-900">{formatNumber(channel.contactabilityScore)}</td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-1">
                          <EnrichmentStatusBadge status={channel.basicFetchedAt ? "COMPLETED" : "IDLE"} label="基" />
                          <EnrichmentStatusBadge status={channel.lightEnrichmentStatus} label="動" />
                          <EnrichmentStatusBadge status={channel.deepEnrichmentStatus} label="外" />
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-zinc-600">{formatNumber(channel.latestVideoScanCount)}</td>
                      <td className="px-2 py-2">
                        <ChannelStatusBadge status={channel.status} />
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-0.5 text-zinc-500">
                          {channel.tags.length > 0 ? channel.tags.slice(0, 2).map((tag) => <span key={tag}>#{tag}</span>) : <span className="text-zinc-300">-</span>}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <p className="max-w-[100px] truncate text-zinc-500">
                          {channel.note || "-"}
                        </p>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex flex-col gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => void runLightScan(channel.id)}
                            disabled={isLightLoading}
                          >
                            <RefreshCw className={cn("mr-1 h-3 w-3", isLightLoading && "animate-spin")} />
                            {isLightLoading ? "抽出中" : "動画"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void runDeepScan(channel.id)}
                            disabled={isDeepLoading}
                          >
                            <RefreshCw className={cn("mr-1 h-3 w-3", isDeepLoading && "animate-spin")} />
                            {isDeepLoading ? "走査中" : "詳細"}
                          </Button>
                          <Button asChild size="sm" variant="ghost">
                            <Link href={`/channels/${channel.id}?mode=${mode}`}>詳細</Link>
                          </Button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-2 py-2 text-right tabular-nums text-zinc-700">{formatNumber(channel.viewCount)}</td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-2 rounded bg-zinc-50 px-2 py-1">
                          <div className="text-center">
                            <p className="text-[10px] text-zinc-400">low</p>
                            <p className="tabular-nums text-zinc-600">
                              {formatCurrencyYen(channel.estimatedMonthlyIncomeLow)}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-zinc-400">base</p>
                            <p className="font-medium tabular-nums text-zinc-900">
                              {formatCurrencyYen(channel.estimatedMonthlyIncomeBase)}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-emerald-600">high</p>
                            <p className="font-medium tabular-nums text-emerald-700">
                              {formatCurrencyYen(channel.estimatedMonthlyIncomeHigh)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-zinc-900">{formatNumber(channel.avgViewsLast10)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-zinc-600">{formatNumber(channel.medianViewsLast10)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-zinc-700">{formatNumber(channel.postsLast30)}</td>
                      <td className="px-2 py-2 text-zinc-600">{getPostingFrequencyRank(channel.postsLast30)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-zinc-600">{viewsPerSub ? `${viewsPerSub.toFixed(2)}x` : "-"}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-zinc-600">{formatPercent(channel.shortsRatio, 0)}</td>
                      <td className="px-2 py-2 text-zinc-600">{formatDateTime(channel.lastVideoPublishedAt)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-zinc-900">{formatNumber(channel.monthlyViewsEstimate)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-zinc-700">{formatNumber(channel.competitionScore)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-zinc-700">{formatNumber(channel.growthScore)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-zinc-900">{formatNumber(channel.opportunityScore)}</td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-1">
                          <EnrichmentStatusBadge status={channel.basicFetchedAt ? "COMPLETED" : "IDLE"} label="基" />
                          <EnrichmentStatusBadge status={channel.lightEnrichmentStatus} label="分" />
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex flex-col gap-1">
                          <Button asChild size="sm" variant="ghost">
                            <Link href={`/channels/${channel.id}?mode=${mode}`}>詳細</Link>
                          </Button>
                          {channel.lightEnrichmentStatus === "FAILED" ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => void runLightScan(channel.id)}
                              disabled={isLightLoading}
                            >
                              <RefreshCw className={cn("mr-1 h-3 w-3", isLightLoading && "animate-spin")} />
                              再取得
                            </Button>
                          ) : null}
                          {isLightLoading ? <p className="text-[10px] text-blue-600">分析中</p> : null}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}

            {lockedCount > 0
              ? Array.from({ length: Math.min(2, lockedCount) }).map((_, index) => (
                  <tr key={`locked-${index}`} className="bg-zinc-50">
                    <td className="px-3 py-2" colSpan={columnCount}>
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span className="blur-[2px]">ロックされたチャンネル</span>
                        {plan === "FREE" && index === 0 ? <UpgradeDialog triggerLabel="解除" /> : null}
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
