import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardStats, getRecentSearchHistory } from "@/lib/channels";
import { HOME_METRICS } from "@/lib/constants";
import { formatDate, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [stats, recentHistory] = await Promise.all([getDashboardStats(), getRecentSearchHistory(4)]);

  return (
    <AppShell>
      {/* ヒーローセクション */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div>
            <span className="inline-block rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              YouTube営業リスト + 競合分析
            </span>
            <h1 className="mt-4 text-2xl font-semibold text-zinc-900 lg:text-3xl">
              チャンネル検索から営業リスト化、
              <br className="hidden sm:block" />
              ライバル分析まで一画面で完結
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-600">
              YouTube Data API v3 を使って関連チャンネルを収集し、営業リスト化とライバル分析を切り替えて使えます。
              検索直後は基本情報をすぐ表示し、動画分析や連絡先補完は後から順次反映されます。
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/search?mode=sales">営業モードで検索</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/search?mode=rival">ライバル調査を始める</Link>
              </Button>
            </div>
          </div>

          {/* 最近の検索履歴 */}
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
            <p className="text-xs font-medium text-zinc-500">最近の検索</p>
            <div className="mt-3 space-y-2">
              {recentHistory.length > 0 ? (
                recentHistory.map((history) => (
                  <Link
                    key={history.id}
                    href={`/search?keyword=${encodeURIComponent(history.conditions.keyword)}&mode=${history.conditions.mode}&minSubscribers=${
                      history.conditions.minSubscribers
                    }&minVideos=${history.conditions.minVideos}&maxResults=${history.conditions.maxResults}&order=${
                      history.conditions.order
                    }&hasContactOnly=${history.conditions.hasContactOnly}&preferJapanese=${history.conditions.preferJapanese}`}
                    className="block rounded-md bg-white p-2.5 transition hover:bg-zinc-100"
                  >
                    <p className="text-sm font-medium text-zinc-900">{history.keyword}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {history.resultCount} 件 / {formatDate(history.executedAt)}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="py-4 text-center text-xs text-zinc-400">履歴なし</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 統計サマリー */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {HOME_METRICS.map((metric) => (
          <div key={metric.key} className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-500">{metric.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">
              {formatNumber(stats[metric.key as keyof typeof stats])}
            </p>
            <p className="mt-1 text-xs text-zinc-400">{metric.description}</p>
          </div>
        ))}
      </section>

      {/* 機能説明 */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>営業モード</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-600">
            <p>検索後は基本情報をすぐ保存し、一覧に表示します。</p>
            <p>動画概要欄の補完が順次進み、必要な行だけ外部サイトの詳細走査を実行できます。</p>
            <p>タグ、メモ、ステータス管理とAI営業文面の下書き生成まで対応。</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ライバル調査モード</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-600">
            <p>直近動画の平均再生、投稿頻度、Shorts率、再生効率を一覧で比較できます。</p>
            <p>想定月収は low / base / high の3段階で表示し、一覧でも詳細でも比較可能。</p>
            <p>競合度、成長性、参入魅力度を見ながら、参入余地のあるジャンルを探せます。</p>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
