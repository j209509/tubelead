"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpDown, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  BestContactBadge,
  ContactTypeBadge,
  EnrichmentStatusBadge,
} from "@/components/channels/channel-badges";
import { UpgradeDialog } from "@/components/channels/upgrade-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SerializedChannel } from "@/lib/channel-types";
import type { AppModeValue, AppPlanValue, ChannelSortValue } from "@/lib/constants";
import { cn, formatCompactNumber, formatCurrencyYen, formatNumber, truncate } from "@/lib/utils";

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
const CATEGORY_PILL_STYLES = [
  "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
  "bg-violet-50 text-violet-700 ring-1 ring-violet-100",
  "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
] as const;

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
      label: "待機中",
      description: `対象 ${formatNumber(totalCount)} 件の取得状況を集計しています。`,
    };
  }

  if (status.targetCount === 0) {
    return {
      tone: "slate" as const,
      label: "対象なし",
      description: "現在の絞り込み条件に一致するチャンネルはありません。",
    };
  }

  if (status.pendingCount === 0 && status.processingCount === 0 && status.failedCount === 0) {
    return {
      tone: "green" as const,
      label: "調査完了",
      description: `全 ${formatNumber(status.targetCount)} 件の推定月収と直近動画指標の取得が完了しました。`,
    };
  }

  if (status.pendingCount === 0 && status.processingCount === 0 && status.failedCount > 0) {
    return {
      tone: "amber" as const,
      label: "一部失敗",
      description: `${formatNumber(status.completedCount)} 件完了 / ${formatNumber(status.failedCount)} 件失敗しています。`,
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

function getPostingFrequencyText(postsLast30: number | null | undefined) {
  const posts = postsLast30 || 0;

  if (posts >= 12) return "週3本以上";
  if (posts >= 3) return "月3本以上";
  if (posts >= 1) return "月1-2本";
  return "投稿少なめ";
}

function getIncomeBarWidth(value: number | null | undefined, maxValue: number) {
  if (!value || maxValue <= 0) {
    return 0;
  }

  return Math.max(12, Math.min(100, Math.round((value / maxValue) * 100)));
}

function getCategoryPillClass(category: string | null | undefined) {
  const key = (category || "未分類")
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return CATEGORY_PILL_STYLES[key % CATEGORY_PILL_STYLES.length];
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function isEmail(value: string) {
  return value.includes("@") && !value.includes(" ");
}

function renderContactValue(channel: SerializedChannel) {
  const value = channel.bestContactValue;

  if (!value) {
    return <span className="text-slate-400">-</span>;
  }

  if (isHttpUrl(value)) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="line-clamp-3 break-all text-blue-600 underline-offset-2 hover:underline"
      >
        {value}
      </a>
    );
  }

  if (isEmail(value)) {
    return (
      <a href={`mailto:${value}`} className="break-all text-blue-600 underline-offset-2 hover:underline">
        {value}
      </a>
    );
  }

  return <span className="break-all text-slate-700">{value}</span>;
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
  const columnCount = isSales ? 12 : 7;
  const allVisibleSelected = isSales && rows.length > 0 && selectedIds.length === rows.length;

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

  const maxVisibleIncomeHigh = useMemo(
    () =>
      rows.reduce((max, row) => {
        const current = row.estimatedMonthlyIncomeHigh || 0;
        return current > max ? current : max;
      }, 0),
    [rows],
  );

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
      <div className="flex flex-col gap-3 rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
        {isSales ? (
          <>
            <p className="text-sm font-medium text-slate-900">
              検索直後は基本情報のみを表示し、あとから動画分析や連絡先補完を順次反映します。
            </p>
            <p className="text-xs text-slate-500">
              基本取得済み {formatNumber(visibleSummary.basicReadyCount)} 件 / 動画分析済み{" "}
              {formatNumber(visibleSummary.lightCompletedCount)} 件 / 補完待ち{" "}
              {formatNumber(visibleSummary.lightPendingCount)} 件 / 分析中{" "}
              {formatNumber(visibleSummary.lightProcessingCount)} 件 / 外部走査済み{" "}
              {formatNumber(visibleSummary.deepCompletedCount)} 件
            </p>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={rivalStatusMeta.tone}>{rivalStatusMeta.label}</Badge>
              <p className="text-sm font-medium text-slate-900">{rivalStatusMeta.description}</p>
            </div>
            <p className="text-xs text-slate-500">
              完了 {formatNumber(autoScanStatus?.completedCount || 0)} 件 / 処理中{" "}
              {formatNumber(autoScanStatus?.processingCount || 0)} 件 / 待機{" "}
              {formatNumber(autoScanStatus?.pendingCount || 0)} 件 / 失敗{" "}
              {formatNumber(autoScanStatus?.failedCount || 0)} 件
            </p>
          </>
        )}

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
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds([])}
                disabled={selectedIds.length === 0}
              >
                選択解除
              </Button>
            </>
          ) : (
            <p className="text-xs text-slate-500">並び替え: {currentSort}</p>
          )}
        </div>
      </div>

      {actionError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {actionError}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg font-semibold text-slate-950">{isSales ? "営業リスト" : "チャンネル比較"}</p>
              <p className="text-sm text-slate-500">
                {isSales
                  ? "保存済みチャンネルの連絡先と補完状況を確認できます。"
                  : "登録者数、平均視聴回数、投稿頻度、想定月収を横並びで比較できます。"}
              </p>
            </div>
            {!isSales ? (
              <p className="text-xs text-slate-500">
                推定月収は自動で補完され、取得できた行から順次一覧に反映されます。
              </p>
            ) : null}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className={cn("w-full divide-y divide-slate-200 text-sm", isSales ? "min-w-[1380px]" : "min-w-[1180px]")}>
            <thead className="bg-slate-50/90 text-left text-slate-500">
              <tr>
                {isSales ? (
                  <>
                    <th className="px-4 py-3 font-medium">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300"
                        checked={allVisibleSelected}
                        onChange={(event) => toggleAll(event.target.checked)}
                      />
                    </th>
                    <th className="px-4 py-3 font-medium">チャンネル名</th>
                    <th className="px-4 py-3 font-medium">
                      <GlobalSortHeader
                        label="登録者数"
                        active={currentSort === "subscribers"}
                        onClick={() => pushGlobalSort("subscribers")}
                      />
                    </th>
                    <th className="px-4 py-3 font-medium">
                      <GlobalSortHeader
                        label="動画数"
                        active={currentSort === "videos"}
                        onClick={() => pushGlobalSort("videos")}
                      />
                    </th>
                    <th className="px-4 py-3 font-medium">
                      <GlobalSortHeader
                        label="総再生数"
                        active={currentSort === "views"}
                        onClick={() => pushGlobalSort("views")}
                      />
                    </th>
                    <th className="px-4 py-3 font-medium">カテゴリ</th>
                    <th className="px-4 py-3 font-medium">地域</th>
                    <th className="px-4 py-3 font-medium">連絡先種別</th>
                    <th className="px-4 py-3 font-medium">bestContact</th>
                    <th className="px-4 py-3 font-medium">連絡先</th>
                    <th className="px-4 py-3 font-medium">
                      <GlobalSortHeader
                        label="連絡可能性"
                        active={currentSort === "contactability"}
                        onClick={() => pushGlobalSort("contactability")}
                      />
                    </th>
                    <th className="px-4 py-3 font-medium">操作</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-4 font-medium">チャンネル名</th>
                    <th className="px-4 py-4 font-medium">カテゴリ</th>
                    <th className="px-4 py-4 font-medium">
                      <GlobalSortHeader
                        label="登録者数"
                        active={currentSort === "subscribers"}
                        onClick={() => pushGlobalSort("subscribers")}
                      />
                    </th>
                    <th className="px-4 py-4 font-medium">
                      <GlobalSortHeader
                        label="平均視聴回数"
                        active={currentSort === "avgViews"}
                        onClick={() => pushGlobalSort("avgViews")}
                      />
                    </th>
                    <th className="px-4 py-4 font-medium">
                      <GlobalSortHeader
                        label="投稿頻度"
                        active={currentSort === "posts30"}
                        onClick={() => pushGlobalSort("posts30")}
                      />
                    </th>
                    <th className="px-4 py-4 font-medium">
                      <GlobalSortHeader
                        label="想定月収"
                        active={currentSort === "incomeHigh"}
                        onClick={() => pushGlobalSort("incomeHigh")}
                      />
                    </th>
                    <th className="px-6 py-4 text-right font-medium">アクション</th>
                  </>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 bg-white">
              {rows.map((channel) => {
                const isLightLoading = lightLoadingIds.includes(channel.id);
                const categoryLabel = channel.categoryGuess || "未分類";

                if (!isSales) {
                  const barWidth = getIncomeBarWidth(channel.estimatedMonthlyIncomeHigh, maxVisibleIncomeHigh);

                  return (
                    <tr key={channel.id} className="align-top transition hover:bg-slate-50/80">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <img
                            src={channel.thumbnailUrl || "https://placehold.co/64x64/e2e8f0/0f172a?text=TL"}
                            alt={channel.title}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                          <div className="min-w-0 space-y-1">
                            <p className="truncate font-semibold text-slate-950">{channel.title}</p>
                            <p className="text-xs text-slate-500">{formatCompactNumber(channel.subscriberCount)} 登録者</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-5">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-3 py-1 text-xs font-medium",
                            getCategoryPillClass(categoryLabel),
                          )}
                        >
                          {categoryLabel}
                        </span>
                      </td>
                      <td className="px-4 py-5 font-medium text-slate-900">{formatCompactNumber(channel.subscriberCount)}</td>
                      <td className="px-4 py-5 text-slate-700">{formatCompactNumber(channel.avgViewsLast10)}</td>
                      <td className="px-4 py-5">
                        <div className="space-y-1">
                          <p className="font-medium text-slate-900">{getPostingFrequencyText(channel.postsLast30)}</p>
                          <p className="text-xs text-slate-500">直近30日 {formatNumber(channel.postsLast30)} 本</p>
                        </div>
                      </td>
                      <td className="px-4 py-5">
                        <div className="min-w-[220px] max-w-[260px] space-y-3">
                          <div className="space-y-1">
                            <p className="text-xl font-semibold tracking-tight text-slate-950">
                              {formatCurrencyYen(channel.estimatedMonthlyIncomeBase)}
                            </p>
                            <p className="text-xs text-slate-500">
                              low {formatCurrencyYen(channel.estimatedMonthlyIncomeLow)} / high{" "}
                              {formatCurrencyYen(channel.estimatedMonthlyIncomeHigh)}
                            </p>
                          </div>
                          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-3">
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
                          <Button asChild size="sm" variant="ghost" className="text-blue-600 hover:text-blue-700">
                            <Link href={`/channels/${channel.id}?mode=${mode}`}>詳細 →</Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={channel.id} className="align-top transition hover:bg-slate-50/70">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300"
                        checked={selectedIds.includes(channel.id)}
                        onChange={() => toggleSelection(channel.id)}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={channel.thumbnailUrl || "https://placehold.co/64x64/e2e8f0/0f172a?text=TL"}
                          alt={channel.title}
                          className="h-11 w-11 rounded-full object-cover"
                        />
                        <div className="min-w-0 max-w-[170px] space-y-1">
                          <p className="truncate font-medium text-slate-900">{channel.title}</p>
                          <p className="text-xs text-slate-500">{truncate(channel.sourceQuery, 40)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-700">{formatNumber(channel.subscriberCount)}</td>
                    <td className="px-4 py-4 text-slate-700">{formatNumber(channel.videoCount)}</td>
                    <td className="px-4 py-4 text-slate-700">{formatCompactNumber(channel.viewCount)}</td>
                    <td className="px-4 py-4">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-3 py-1 text-xs font-medium",
                          getCategoryPillClass(channel.categoryGuess),
                        )}
                      >
                        {channel.categoryGuess || "未分類"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-700">{channel.regionGuess || "-"}</td>
                    <td className="px-4 py-4">
                      <ContactTypeBadge contactType={channel.contactType} />
                    </td>
                    <td className="px-4 py-4">
                      <BestContactBadge method={channel.bestContactMethod} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="max-w-[190px]">{renderContactValue(channel)}</div>
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-900">{formatNumber(channel.contactabilityScore)}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-start gap-2">
                        <div className="flex flex-wrap gap-2">
                          <EnrichmentStatusBadge status={channel.basicFetchedAt ? "COMPLETED" : "IDLE"} label="基本" />
                          <EnrichmentStatusBadge status={channel.lightEnrichmentStatus} label="動画" />
                          <EnrichmentStatusBadge status={channel.deepEnrichmentStatus} label="外部" />
                        </div>
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/channels/${channel.id}?mode=${mode}`}>詳細</Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {lockedCount > 0
                ? Array.from({ length: Math.min(3, lockedCount) }).map((_, index) => (
                    <tr key={`locked-${index}`} className="opacity-70">
                      <td className="px-4 py-4" colSpan={columnCount}>
                        <div className="flex items-center justify-between rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4">
                          <div className="blur-[3px]">11件目以降のチャンネルは無料版ではロック表示です。</div>
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
    </div>
  );
}
