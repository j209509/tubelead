"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { EnrichmentStatusBadge } from "@/components/channels/channel-badges";
import { UpgradeDialog } from "@/components/channels/upgrade-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ChannelDraft, SerializedChannel } from "@/lib/channel-types";
import { LENGTH_LABELS, MODE_LABELS, TONE_LABELS, type AppModeValue } from "@/lib/constants";
import type { SerializedSettings } from "@/lib/settings";
import { formatDateTime } from "@/lib/utils";

function splitTags(value: string) {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ChannelDetailEditor({
  channel,
  drafts,
  settings,
  mode,
}: {
  channel: SerializedChannel;
  drafts: ChannelDraft[];
  settings: SerializedSettings;
  mode: AppModeValue;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(channel.status);
  const [note, setNote] = useState(channel.note);
  const [tagsInput, setTagsInput] = useState(channel.tags.join(", "));
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  const [serviceName, setServiceName] = useState(settings.serviceName);
  const [serviceDescription, setServiceDescription] = useState(settings.serviceDescription);
  const [defaultPitch, setDefaultPitch] = useState(settings.defaultPitch);
  const [tone, setTone] = useState(settings.tone);
  const [lengthPreference, setLengthPreference] = useState(settings.lengthPreference);
  const [generating, setGenerating] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [draftItems, setDraftItems] = useState(drafts);
  const [scanMessage, setScanMessage] = useState("");
  const [scanError, setScanError] = useState("");
  const [scanLoading, setScanLoading] = useState<"videos" | "external" | null>(null);

  async function handleSaveMeta() {
    setSaving(true);
    setSaveMessage("");
    setSaveError("");

    const response = await fetch(`/api/channels/${channel.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status,
        note,
        tags: splitTags(tagsInput),
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setSaveError(data.error || "メタ情報の保存に失敗しました。");
      setSaving(false);
      return;
    }

    setSaveMessage("タグ・メモ・ステータスを保存しました。");
    setSaving(false);
    router.refresh();
  }

  async function handleGenerateDraft() {
    setGenerating(true);
    setDraftError("");
    setDraftMessage("");

    const response = await fetch("/api/drafts/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channelId: channel.id,
        serviceName,
        serviceDescription,
        defaultPitch,
        tone,
        lengthPreference,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      if (data.requiresUpgrade) {
        setUpgradeOpen(true);
      } else {
        setDraftError(data.error || "AI営業文面の生成に失敗しました。");
      }
      setGenerating(false);
      return;
    }

    setDraftItems((current) => [data.draft, ...current]);
    setDraftMessage("営業文面の下書きを保存しました。");
    setGenerating(false);
  }

  async function handleRescan(type: "videos" | "external") {
    setScanLoading(type);
    setScanMessage("");
    setScanError("");

    const response = await fetch(`/api/channels/${channel.id}/scan-${type}`, {
      method: "POST",
    });
    const data = await response.json();

    if (!response.ok) {
      setScanError(data.error || "再走査に失敗しました。");
      setScanLoading(null);
      return;
    }

    setScanMessage(type === "videos" ? "動画分析を更新しました。" : "外部サイト詳細走査を更新しました。");
    setScanLoading(null);
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>現在のモード</CardTitle>
          <CardDescription>{MODE_LABELS[mode]}に合わせて右側の操作内容も使い分けられます。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            <EnrichmentStatusBadge status={channel.basicFetchedAt ? "COMPLETED" : "IDLE"} label="基本取得" />
            <EnrichmentStatusBadge status={channel.lightEnrichmentStatus} label="動画走査" />
            <EnrichmentStatusBadge status={channel.deepEnrichmentStatus} label="外部走査" />
          </div>
          <div className="grid gap-2 text-sm text-slate-600">
            <p>基本取得: {formatDateTime(channel.basicFetchedAt)}</p>
            <p>動画走査更新: {formatDateTime(channel.lightEnrichmentUpdatedAt)}</p>
            <p>外部走査更新: {formatDateTime(channel.deepEnrichmentUpdatedAt)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>管理メモ</CardTitle>
          <CardDescription>
            {mode === "rival"
              ? "差別化メモや参入判断メモとして使えます。"
              : "営業候補としてのタグ、メモ、ステータスを整理できます。"}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="status">ステータス</Label>
            <select
              id="status"
              value={status}
              onChange={(event) => setStatus(event.target.value as typeof status)}
              className="h-11 rounded-xl border border-slate-200 bg-white/90 px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              <option value="UNREVIEWED">未確認</option>
              <option value="REVIEWED">確認済み</option>
              <option value="CONTACT_CANDIDATE">連絡候補</option>
              <option value="HOLD">保留</option>
              <option value="EXCLUDED">除外</option>
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tags">タグ</Label>
            <Input id="tags" value={tagsInput} onChange={(event) => setTagsInput(event.target.value)} placeholder="例: 犬, 有望, 企業" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="note">{mode === "rival" ? "差別化メモ" : "メモ"}</Label>
            <Textarea id="note" value={note} onChange={(event) => setNote(event.target.value)} />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={handleSaveMeta} disabled={saving}>
              {saving ? "保存中..." : "管理情報を保存"}
            </Button>
            {saveMessage ? <p className="text-sm text-emerald-600">{saveMessage}</p> : null}
            {saveError ? <p className="text-sm text-rose-500">{saveError}</p> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>再走査</CardTitle>
          <CardDescription>動画分析の更新と、必要なときだけ外部サイトの詳細走査を実行できます。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" onClick={() => handleRescan("videos")} disabled={scanLoading !== null}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {scanLoading === "videos" ? "動画分析を更新中..." : "動画分析を更新"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => handleRescan("external")} disabled={scanLoading !== null}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {scanLoading === "external" ? "外部走査中..." : "連絡先詳細検索"}
            </Button>
          </div>
          {scanMessage ? <p className="text-sm text-emerald-600">{scanMessage}</p> : null}
          {scanError ? <p className="text-sm text-rose-500">{scanError}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI営業文面の下書き</CardTitle>
          <CardDescription>無料版では 3 件まで保存可能です。ライバル調査モードでも営業メモ化したい時に使えます。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="serviceName">サービス名</Label>
            <Input id="serviceName" value={serviceName} onChange={(event) => setServiceName(event.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="serviceDescription">サービス説明</Label>
            <Textarea
              id="serviceDescription"
              value={serviceDescription}
              onChange={(event) => setServiceDescription(event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="defaultPitch">提案したい内容</Label>
            <Textarea id="defaultPitch" value={defaultPitch} onChange={(event) => setDefaultPitch(event.target.value)} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="tone">文体</Label>
              <select
                id="tone"
                value={tone}
                onChange={(event) => setTone(event.target.value as typeof tone)}
                className="h-11 rounded-xl border border-slate-200 bg-white/90 px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                {Object.entries(TONE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="lengthPreference">文字数感</Label>
              <select
                id="lengthPreference"
                value={lengthPreference}
                onChange={(event) => setLengthPreference(event.target.value as typeof lengthPreference)}
                className="h-11 rounded-xl border border-slate-200 bg-white/90 px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                {Object.entries(LENGTH_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={handleGenerateDraft} disabled={generating}>
              <Sparkles className="mr-2 h-4 w-4" />
              {generating ? "生成中..." : "下書きを生成して保存"}
            </Button>
            {draftMessage ? <p className="text-sm text-emerald-600">{draftMessage}</p> : null}
            {draftError ? <p className="text-sm text-rose-500">{draftError}</p> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>保存済み下書き</CardTitle>
          <CardDescription>チャンネルごとに複数の下書きを保存できます。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {draftItems.length === 0 ? (
            <p className="text-sm text-slate-500">まだ下書きはありません。</p>
          ) : (
            draftItems.map((draft) => (
              <div key={draft.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium text-slate-900">{draft.subject}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(draft.createdAt)}</p>
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{draft.body}</p>
                {draft.customPoint ? (
                  <p className="mt-3 text-sm text-slate-600">
                    <span className="font-medium text-slate-900">カスタムポイント:</span> {draft.customPoint}
                  </p>
                ) : null}
                {draft.rationale ? (
                  <p className="mt-2 text-sm text-slate-500">
                    <span className="font-medium text-slate-700">理由:</span> {draft.rationale}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
}
