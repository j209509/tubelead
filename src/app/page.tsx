import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardStats, getRecentSearchHistory } from "@/lib/channels";
import { HOME_METRICS } from "@/lib/constants";
import { formatDate, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [stats, recentHistory] = await Promise.all([getDashboardStats(), getRecentSearchHistory(4)]);

  return (
    <AppShell>
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.85fr)]">
        <Card className="overflow-hidden">
          <CardContent className="p-8 md:p-10">
            <div className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              検索・保存・一覧管理・AI文面・ライバル調査
            </div>
            <h1 className="mt-6 max-w-3xl font-serif text-4xl leading-tight text-slate-950 md:text-5xl">
              YouTube専用の営業リスト作成と、競合チャンネル分析を一つの画面で。
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              TubeLead は YouTube Data API v3 を使って関連チャンネルを収集し、営業リスト化とライバル分析を切り替えて使えるローカルMVPです。
              検索直後は基本情報をすぐ表示し、動画分析や連絡先補完は後から順次反映されます。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/search?mode=sales">営業モードで検索</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/search?mode=rival">ライバル調査を始める</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>すぐ確認できること</CardTitle>
            <CardDescription>最近の検索履歴から、そのまま再検索できます。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {recentHistory.map((history) => (
              <Link
                key={history.id}
                href={`/search?keyword=${encodeURIComponent(history.conditions.keyword)}&mode=${history.conditions.mode}&minSubscribers=${
                  history.conditions.minSubscribers
                }&minVideos=${history.conditions.minVideos}&maxResults=${history.conditions.maxResults}&order=${
                  history.conditions.order
                }&hasContactOnly=${history.conditions.hasContactOnly}&preferJapanese=${history.conditions.preferJapanese}`}
                className="rounded-2xl border border-slate-200 bg-white/80 p-4 transition hover:border-slate-300 hover:bg-white"
              >
                <p className="text-sm font-semibold text-slate-900">{history.keyword}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {history.resultCount} 件 / {formatDate(history.executedAt)}
                </p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {HOME_METRICS.map((metric) => (
          <Card key={metric.key}>
            <CardContent className="p-6">
              <p className="text-sm text-slate-500">{metric.label}</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">
                {formatNumber(stats[metric.key as keyof typeof stats])}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{metric.description}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>営業モードでできること</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-slate-600">
            <p>検索後は基本情報をすぐ保存し、一覧に表示します。</p>
            <p>その後に動画概要欄の補完が順次進み、必要な行だけ外部サイトの詳細走査を実行できます。</p>
            <p>タグ、メモ、ステータス管理とAI営業文面の下書き生成まで行えます。</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ライバル調査モードでできること</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-slate-600">
            <p>直近動画の平均再生、投稿頻度、Shorts率、再生効率を一覧で比較できます。</p>
            <p>想定月収は low / base / high の3段階で表示し、一覧でも詳細でも比較できます。</p>
            <p>競合度、成長性、参入魅力度を見ながら、参入余地のあるジャンルを探せます。</p>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
