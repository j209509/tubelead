"use client";

import { ChevronRight, Clock3, Home, RotateCcw, Sparkles, TrendingUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SerializedSearchHistory } from "@/lib/channels";
import { MODE_LABELS } from "@/lib/constants";
import { searchFormSchema, type SearchFormInput } from "@/lib/schemas";
import { formatDate, formatNumber } from "@/lib/utils";

const progressSteps = [
  "競合チャンネル検索中",
  "基本情報を整理中",
  "ローカルへ保存中",
  "一覧画面へ移動中",
];

type RivalSearchPanelProps = {
  defaultValues: SearchFormInput;
  recentHistory: SerializedSearchHistory[];
};

type SearchResultState = {
  source: "youtube-api" | "mock";
  fetchedCount: number;
  savedCount: number;
  pagesFetched: number;
  quotaUsed: number;
  errors: string[];
  nextPath: string;
};

function buildHistoryHref(history: SerializedSearchHistory) {
  const basePath = history.conditions.mode === "rival" ? "/rival-search" : "/search";

  return `${basePath}?keyword=${encodeURIComponent(history.conditions.keyword)}&mode=${history.conditions.mode}&minSubscribers=${
    history.conditions.minSubscribers
  }&minVideos=${history.conditions.minVideos}&maxResults=${history.conditions.maxResults}&order=${
    history.conditions.order
  }&hasContactOnly=${history.conditions.hasContactOnly}&preferJapanese=${history.conditions.preferJapanese}`;
}

export function RivalSearchPanel({ defaultValues, recentHistory }: RivalSearchPanelProps) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState<SearchResultState | null>(null);
  const [error, setError] = useState("");
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const fallbackTimerRef = useRef<number | null>(null);

  const form = useForm<SearchFormInput>({
    defaultValues: {
      ...defaultValues,
      mode: "rival",
    },
  });

  useEffect(() => {
    router.prefetch("/channels?mode=rival");
  }, [router]);

  useEffect(() => {
    if (!form.formState.isSubmitting && !isRedirecting) {
      setStepIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setStepIndex((current) => Math.min(current + 1, progressSteps.length - 1));
    }, 800);

    return () => window.clearInterval(timer);
  }, [form.formState.isSubmitting, isRedirecting]);

  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current) {
        window.clearTimeout(fallbackTimerRef.current);
      }
    };
  }, []);

  const applyHistory = (history: SerializedSearchHistory) => {
    if (history.conditions.mode === "sales") {
      window.location.assign(buildHistoryHref(history));
      return;
    }

    form.reset(history.conditions);
    setResult(null);
    setError("");
    setIsRedirecting(false);
  };

  const resetForm = () => {
    form.reset({
      ...defaultValues,
      mode: "rival",
    });
    setResult(null);
    setError("");
    setIsRedirecting(false);
  };

  const onSubmit = form.handleSubmit(async (rawValues) => {
    setError("");
    setResult(null);
    setIsRedirecting(false);

    const parsed = searchFormSchema.safeParse({
      ...rawValues,
      mode: "rival",
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "検索条件が不正です。");
      return;
    }

    const response = await fetch("/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsed.data),
    });

    const data = await response.json();
    if (!response.ok) {
      setIsRedirecting(false);
      setError(data.error || "検索に失敗しました。");
      return;
    }

    setResult(data);
    setIsRedirecting(true);
    router.push(data.nextPath);

    if (fallbackTimerRef.current) {
      window.clearTimeout(fallbackTimerRef.current);
    }

    fallbackTimerRef.current = window.setTimeout(() => {
      window.location.assign(data.nextPath);
    }, 1200);
  });

  const visibleHistory = showAllHistory ? recentHistory : recentHistory.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Home className="h-4 w-4" />
        <ChevronRight className="h-4 w-4 text-slate-300" />
        <span className="font-medium text-slate-900">ライバル調査を始める</span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_380px]">
        <Card className="rounded-[28px] border-slate-200 bg-white shadow-[0_18px_45px_-40px_rgba(15,23,42,0.45)]">
          <CardContent className="p-8 md:p-10">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-fuchsia-50 text-fuchsia-600">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight text-slate-950">ライバル調査を始める</h1>
                <p className="mt-2 text-base text-slate-500">競合チャンネルの市場分析・参入余地を探す準備画面です</p>
              </div>
            </div>

            <form className="mt-12 grid gap-10" onSubmit={onSubmit}>
              <input type="hidden" {...form.register("mode")} />

              <div className="grid gap-4">
                <div className="space-y-1">
                  <Label htmlFor="keyword" className="text-base font-semibold text-slate-950">
                    検索キーワード
                  </Label>
                </div>
                <div className="grid gap-2">
                  <Input
                    id="keyword"
                    className="h-14 rounded-2xl bg-slate-50 px-4 text-base"
                    placeholder="例: コーヒー、釣り、料理など"
                    {...form.register("keyword")}
                  />
                  <p className="text-sm text-slate-500">競合チャンネル名、動画タイトル、説明文から検索します</p>
                  <p className="text-sm text-rose-500">{form.formState.errors.keyword?.message}</p>
                </div>
              </div>

              <div className="grid gap-4">
                <h2 className="text-base font-semibold text-slate-950">詳細条件</h2>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="grid gap-3">
                    <Label htmlFor="minSubscribers" className="text-sm font-medium text-slate-700">
                      最低登録者数
                    </Label>
                    <Input
                      id="minSubscribers"
                      type="number"
                      min={0}
                      className="h-11 rounded-2xl bg-slate-50"
                      {...form.register("minSubscribers", {
                        setValueAs: (value) => (value === "" ? 0 : Number(value)),
                      })}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="minVideos" className="text-sm font-medium text-slate-700">
                      最低動画数
                    </Label>
                    <Input
                      id="minVideos"
                      type="number"
                      min={0}
                      className="h-11 rounded-2xl bg-slate-50"
                      {...form.register("minVideos", {
                        setValueAs: (value) => (value === "" ? 0 : Number(value)),
                      })}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="maxResults" className="text-sm font-medium text-slate-700">
                      最大取得件数
                    </Label>
                    <Input
                      id="maxResults"
                      type="number"
                      min={1}
                      max={5000}
                      className="h-11 rounded-2xl bg-slate-50"
                      {...form.register("maxResults", {
                        setValueAs: (value) => (value === "" ? 300 : Number(value)),
                      })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-5">
                <h2 className="text-base font-semibold text-slate-950">オプション</h2>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300" {...form.register("hasContactOnly")} />
                    連絡先ありのみ
                  </label>
                  <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300" {...form.register("preferJapanese")} />
                    日本語チャンネル優先
                  </label>
                </div>

                <div className="grid max-w-sm gap-3">
                  <Label htmlFor="order" className="text-sm font-medium text-slate-700">
                    並び順
                  </Label>
                  <select
                    id="order"
                    className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-fuchsia-400 focus:ring-4 focus:ring-fuchsia-100"
                    {...form.register("order")}
                  >
                    <option value="relevance">関連度順</option>
                    <option value="date">新しい順</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-8">
                <div className="flex flex-col gap-4 md:flex-row">
                  <Button
                    type="submit"
                    size="lg"
                    className="h-14 flex-1 rounded-2xl bg-fuchsia-600 text-base text-white shadow-[0_18px_40px_-24px_rgba(168,85,247,0.75)] hover:bg-fuchsia-700 hover:text-white"
                    disabled={form.formState.isSubmitting || isRedirecting}
                  >
                    <TrendingUp className="mr-2 h-5 w-5" />
                    {form.formState.isSubmitting || isRedirecting ? "ライバル調査中..." : "ライバル調査を実行"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    className="h-14 rounded-2xl px-8"
                    onClick={resetForm}
                    disabled={form.formState.isSubmitting || isRedirecting}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    条件をリセット
                  </Button>
                </div>

                <p className="mt-10 text-center text-sm text-slate-500">
                  分析後は一覧ページへ移動し、競合度や成長性を確認できます。
                </p>
              </div>

              {form.formState.isSubmitting || isRedirecting ? (
                <div className="rounded-2xl border border-fuchsia-100 bg-fuchsia-50/90 p-4 text-sm text-fuchsia-900">
                  <div className="flex items-center gap-2 font-medium">
                    <Sparkles className="h-4 w-4" />
                    {progressSteps[stepIndex]}
                  </div>
                  <div className="mt-3 grid gap-2">
                    {progressSteps.map((step, index) => (
                      <div key={step} className={index <= stepIndex ? "text-fuchsia-900" : "text-fuchsia-400"}>
                        {index + 1}. {step}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">{error}</p> : null}

              {result ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-xs text-slate-500">取得元</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {result.source === "youtube-api" ? "YouTube Data API v3" : "モックデータ"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-xs text-slate-500">保存件数</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {result.savedCount} 件保存 / {result.fetchedCount} 件取得
                      </p>
                    </div>
                  </div>

                  {result.errors.length > 0 ? (
                    <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                      {result.errors.map((item) => (
                        <p key={item}>{item}</p>
                      ))}
                    </div>
                  ) : null}

                  {isRedirecting ? (
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                      一覧への移動が遅い場合は、下のボタンから直接開けます。
                      <div className="mt-3">
                        <Button asChild variant="secondary" size="sm">
                          <a href={result.nextPath}>一覧を開く</a>
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-slate-200 bg-white shadow-[0_18px_45px_-40px_rgba(15,23,42,0.45)]">
          <CardHeader className="p-6 pb-4">
            <div className="flex items-center gap-3">
              <Clock3 className="h-5 w-5 text-slate-500" />
              <CardTitle className="text-3xl tracking-tight text-slate-950">最近の検索履歴</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-full flex-col gap-4 p-6 pt-4">
            {visibleHistory.length > 0 ? (
              visibleHistory.map((history) => (
                <button
                  key={history.id}
                  type="button"
                  onClick={() => applyHistory(history)}
                  className="rounded-[22px] border border-slate-200 bg-white p-5 text-left transition hover:border-slate-300 hover:shadow-[0_18px_40px_-34px_rgba(15,23,42,0.35)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-2xl font-semibold tracking-tight text-slate-950">{history.keyword}</p>
                    <span className="text-sm font-medium text-slate-500">{formatDate(history.executedAt)}</span>
                  </div>
                  <p className="mt-4 text-sm font-medium text-slate-600">{MODE_LABELS[history.conditions.mode]}</p>
                  <p className="mt-2 text-sm text-slate-500">
                    取得 {formatNumber(history.resultCount)} 件 / 保存 {formatNumber(history.savedCount)} 件
                  </p>
                </button>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm leading-7 text-slate-500">
                まだ検索履歴はありません。ここに最近の検索条件が表示されます。
              </div>
            )}

            {recentHistory.length > 5 ? (
              <button
                type="button"
                onClick={() => setShowAllHistory((current) => !current)}
                className="mt-auto pt-4 text-center text-base font-medium text-fuchsia-600 transition hover:text-fuchsia-700"
              >
                {showAllHistory ? "履歴をたたむ" : "すべての履歴を見る"}
              </button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
