"use client";

import { ChevronRight, Clock3, Home, RotateCcw, Search, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SerializedSearchHistory } from "@/lib/channels";
import { MODE_LABELS, type AppModeValue } from "@/lib/constants";
import { searchFormSchema, type SearchFormInput } from "@/lib/schemas";
import { cn, formatDate, formatNumber } from "@/lib/utils";

const progressSteps = [
  "YouTubeチャンネル検索中",
  "基本情報を整理中",
  "ローカルへ保存中",
  "一覧画面へ移動中",
];

const modeDescriptions: Record<AppModeValue, string> = {
  sales: "連絡先調査と営業候補の整理を優先します。",
  rival: "想定月収と直近動画の強さを見ながら比較するモードです。",
};

const orderLabels = {
  relevance: "関連度順",
  date: "新しい順",
} as const;

type SearchFormPanelProps = {
  defaultValues: SearchFormInput;
  recentHistory: SerializedSearchHistory[];
  youtubeConfigured: boolean;
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

type SearchFeedbackProps = {
  isSubmitting: boolean;
  isRedirecting: boolean;
  stepIndex: number;
  result: SearchResultState | null;
  error: string;
};

function SearchFeedback({ isSubmitting, isRedirecting, stepIndex, result, error }: SearchFeedbackProps) {
  return (
    <div className="space-y-4">
      {isSubmitting || isRedirecting ? (
        <div className="rounded-2xl border border-blue-100 bg-blue-50/90 p-4 text-sm text-blue-900">
          <div className="flex items-center gap-2 font-medium">
            <Sparkles className="h-4 w-4" />
            {progressSteps[stepIndex]}
          </div>
          <div className="mt-3 grid gap-2">
            {progressSteps.map((step, index) => (
              <div key={step} className={index <= stepIndex ? "text-blue-900" : "text-blue-400"}>
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
    </div>
  );
}

export function SearchFormPanel({ defaultValues, recentHistory, youtubeConfigured }: SearchFormPanelProps) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState<SearchResultState | null>(null);
  const [error, setError] = useState("");
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const fallbackTimerRef = useRef<number | null>(null);

  const form = useForm<SearchFormInput>({
    defaultValues,
  });
  const currentMode = form.watch("mode");

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
    router.prefetch(`/channels?mode=${currentMode}`);
  }, [currentMode, router]);

  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current) {
        window.clearTimeout(fallbackTimerRef.current);
      }
    };
  }, []);

  const applyHistory = (history: SerializedSearchHistory) => {
    form.reset(history.conditions);
    setResult(null);
    setError("");
    setIsRedirecting(false);
  };

  const resetSalesForm = () => {
    form.reset({
      ...defaultValues,
      mode: "sales",
    });
    setResult(null);
    setError("");
    setIsRedirecting(false);
  };

  const onSubmit = form.handleSubmit(async (rawValues) => {
    setError("");
    setResult(null);
    setIsRedirecting(false);

    const parsed = searchFormSchema.safeParse(rawValues);
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

  if (currentMode === "sales") {
    const visibleHistory = showAllHistory ? recentHistory : recentHistory.slice(0, 5);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Home className="h-4 w-4" />
          <ChevronRight className="h-4 w-4 text-slate-300" />
          <span className="font-medium text-slate-900">営業モードで検索</span>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_380px]">
          <Card className="rounded-[28px] border-slate-200 bg-white shadow-[0_18px_45px_-40px_rgba(15,23,42,0.45)]">
            <CardContent className="p-8 md:p-10">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Search className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-4xl font-semibold tracking-tight text-slate-950">営業モードで検索</h1>
                  <p className="mt-2 text-base text-slate-500">メールアドレス、外部リンクを含むチャンネルを検索</p>
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
                    <p className="text-sm text-slate-500">チャンネル名、動画タイトル、説明文から検索します</p>
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
                      className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      {...form.register("order")}
                    >
                      <option value="relevance">{orderLabels.relevance}</option>
                      <option value="date">{orderLabels.date}</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-8">
                  <div className="flex flex-col gap-4 md:flex-row">
                    <Button
                      type="submit"
                      size="lg"
                      className="h-14 flex-1 rounded-2xl bg-blue-600 text-base text-white shadow-[0_18px_40px_-24px_rgba(37,99,235,0.75)] hover:bg-blue-700 hover:text-white"
                      disabled={form.formState.isSubmitting || isRedirecting}
                    >
                      <Search className="mr-2 h-5 w-5" />
                      {form.formState.isSubmitting || isRedirecting ? "検索中..." : "検索して保存"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="lg"
                      className="h-14 rounded-2xl px-8"
                      onClick={resetSalesForm}
                      disabled={form.formState.isSubmitting || isRedirecting}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      条件をリセット
                    </Button>
                  </div>

                  <p className="mt-10 text-center text-sm text-slate-500">
                    検索後は一覧ページへ移動し、動画分析や連絡先抽出を確認できます。
                  </p>
                </div>

                <SearchFeedback
                  isSubmitting={form.formState.isSubmitting}
                  isRedirecting={isRedirecting}
                  stepIndex={stepIndex}
                  result={result}
                  error={error}
                />
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
                  className="mt-auto pt-4 text-center text-base font-medium text-blue-600 transition hover:text-blue-700"
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

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-slate-950">YouTubeチャンネル検索</h1>
        <p className="max-w-3xl text-sm leading-7 text-slate-500">
          検索直後は基本情報をすぐ一覧化し、その後に動画分析や連絡先補完を順次反映します。営業モードとライバル調査モードをここから切り替えられます。
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>検索条件</CardTitle>
                <CardDescription>
                  検索時はチャンネル基本情報だけを先に保存し、一覧表示後に動画分析を順次補完します。
                </CardDescription>
              </div>
              <Badge tone={youtubeConfigured ? "green" : "amber"}>
                {youtubeConfigured ? "YouTube API 利用中" : "モックデータ表示"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <form className="grid gap-5" onSubmit={onSubmit}>
              <div className="grid gap-3">
                <Label>モード</Label>
                <div className="grid gap-3 md:grid-cols-2">
                  {(["sales", "rival"] as const).map((mode) => (
                    <label
                      key={mode}
                      className={cn(
                        "cursor-pointer rounded-2xl border px-4 py-4 transition",
                        currentMode === mode
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-900 hover:border-slate-300",
                      )}
                    >
                      <input type="radio" value={mode} className="sr-only" {...form.register("mode")} />
                      <p className={cn("text-sm font-semibold", currentMode === mode ? "text-white" : "text-slate-900")}>
                        {MODE_LABELS[mode]}
                      </p>
                      <p className={cn("mt-1 text-xs leading-6", currentMode === mode ? "text-slate-200" : "text-slate-500")}>
                        {modeDescriptions[mode]}
                      </p>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="keyword">キーワード</Label>
                <Input
                  id="keyword"
                  placeholder="例: コーギー / 美容室 / FX 自動売買 / 歯医者"
                  {...form.register("keyword")}
                />
                <p className="text-xs text-rose-500">{form.formState.errors.keyword?.message}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="minSubscribers">最低登録者数</Label>
                  <Input
                    id="minSubscribers"
                    type="number"
                    min={0}
                    {...form.register("minSubscribers", {
                      setValueAs: (value) => (value === "" ? 0 : Number(value)),
                    })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="minVideos">最低動画数</Label>
                  <Input
                    id="minVideos"
                    type="number"
                    min={0}
                    {...form.register("minVideos", {
                      setValueAs: (value) => (value === "" ? 0 : Number(value)),
                    })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="maxResults">最大取得件数</Label>
                  <Input
                    id="maxResults"
                    type="number"
                    min={1}
                    max={5000}
                    {...form.register("maxResults", {
                      setValueAs: (value) => (value === "" ? 300 : Number(value)),
                    })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="order">並び順</Label>
                  <select
                    id="order"
                    className="h-11 rounded-xl border border-slate-200 bg-white/90 px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    {...form.register("order")}
                  >
                    <option value="relevance">relevance</option>
                    <option value="date">date</option>
                  </select>
                </div>

                <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <label className="flex items-center gap-3 text-sm text-slate-700">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300" {...form.register("hasContactOnly")} />
                    連絡先ありのみ
                  </label>
                  <label className="flex items-center gap-3 text-sm text-slate-700">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300" {...form.register("preferJapanese")} />
                    日本語チャンネル優先
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" size="lg" disabled={form.formState.isSubmitting || isRedirecting}>
                  <Search className="mr-2 h-4 w-4" />
                  {form.formState.isSubmitting || isRedirecting ? "検索中..." : "検索して保存"}
                </Button>
                <p className="text-sm text-slate-500">
                  検索後は一覧を即表示し、動画分析や連絡先補完は後から順次反映します。
                </p>
              </div>

              <SearchFeedback
                isSubmitting={form.formState.isSubmitting}
                isRedirecting={isRedirecting}
                stepIndex={stepIndex}
                result={result}
                error={error}
              />
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>最近の検索履歴</CardTitle>
              <CardDescription>クリックすると検索条件をフォームに反映できます。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {recentHistory.map((history) => (
                <button
                  key={history.id}
                  type="button"
                  onClick={() => applyHistory(history)}
                  className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-left transition hover:border-slate-300 hover:bg-white"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{history.keyword}</p>
                    <span className="text-[11px] text-slate-500">{MODE_LABELS[history.conditions.mode]}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    取得 {history.resultCount} 件 / 保存 {history.savedCount} 件
                  </p>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card id="search-result">
            <CardHeader>
              <CardTitle>検索結果</CardTitle>
              <CardDescription>検索完了後は一覧ページへすぐ移動します。</CardDescription>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">取得元</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {result.source === "youtube-api" ? "YouTube Data API v3" : "モックデータ"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">保存件数</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {result.savedCount} 件保存 / {result.fetchedCount} 件取得
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">検索ページ数</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{result.pagesFetched} ページ</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">使用クォータ</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{result.quotaUsed}</p>
                    </div>
                  </div>

                  {result.errors.length > 0 ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                      {result.errors.map((item) => (
                        <p key={item}>{item}</p>
                      ))}
                    </div>
                  ) : null}

                  <p className="text-sm text-slate-500">一覧ページでは、取得済みの行から順番に動画分析が補完されます。</p>

                  {isRedirecting ? (
                    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-700">
                      一覧への移動が遅い場合は、下のボタンから直接開けます。
                      <div className="mt-3">
                        <Button asChild variant="secondary" size="sm">
                          <a href={result.nextPath}>一覧を開く</a>
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-slate-500">まだ検索は実行されていません。</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
