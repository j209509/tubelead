"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RivalAnalysisComment } from "@/lib/channel-types";

export function RivalAnalysisCommentCard({
  channelId,
  initialSummary,
}: {
  channelId: string;
  initialSummary: string;
}) {
  const [comment, setComment] = useState<RivalAnalysisComment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/channels/${channelId}/analyze`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "分析コメントの生成に失敗しました。");
      }

      setComment(data.comment as RivalAnalysisComment);
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析コメントの生成に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI分析コメント</CardTitle>
        <CardDescription>OpenAI APIキー未設定時はダミーコメントを返します。</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Button type="button" variant="secondary" onClick={() => void handleGenerate()} disabled={loading}>
          <Sparkles className="mr-2 h-4 w-4" />
          {loading ? "生成中..." : "分析コメントを生成"}
        </Button>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        {comment ? (
          <div className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
            <div>
              <p className="text-xs text-slate-500">特徴</p>
              <p className="mt-1 text-sm leading-7 text-slate-700">{comment.summary}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">強み</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-7 text-slate-700">
                {comment.strengths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs text-slate-500">弱み</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-7 text-slate-700">
                {comment.weaknesses.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs text-slate-500">刺さりそうな層</p>
              <p className="mt-1 text-sm leading-7 text-slate-700">{comment.audienceFit}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">参入余地</p>
              <p className="mt-1 text-sm leading-7 text-slate-700">{comment.opportunity}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">勝ちやすそうな企画</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-7 text-slate-700">
                {comment.ideas.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5 text-sm leading-7 text-slate-600">
            {initialSummary}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
