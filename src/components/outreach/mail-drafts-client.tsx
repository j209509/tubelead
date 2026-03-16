"use client";

import { CheckCircle2, Clock3, FileText, Mail, Save } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ChannelDraft } from "@/lib/channel-types";
import { cn } from "@/lib/utils";

type GmailConnectionStatus = {
  connected: boolean;
  expiresAt: string | null;
};

type SortValue = "updated_desc" | "created_desc" | "subject_asc" | "channel_asc";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ja-JP");
}

function GmailStatusBadge({ status }: { status: ChannelDraft["gmailSaveStatus"] }) {
  const styles =
    status === "saved"
      ? "bg-emerald-50 text-emerald-700"
      : status === "failed"
        ? "bg-rose-50 text-rose-700"
        : "bg-slate-100 text-slate-600";

  const label = status === "saved" ? "保存済み" : status === "failed" ? "失敗" : "未保存";

  return <span className={cn("rounded-full px-3 py-1 text-xs font-medium", styles)}>{label}</span>;
}

function DraftStatusBadge({ status }: { status: ChannelDraft["status"] }) {
  const styles =
    status === "ready_to_send"
      ? "bg-emerald-50 text-emerald-700"
      : status === "reviewed"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-700";

  const label = status === "ready_to_send" ? "送信前確認OK" : status === "reviewed" ? "確認済み" : "draft";

  return <span className={cn("rounded-full px-3 py-1 text-xs font-medium", styles)}>{label}</span>;
}

export function MailDraftsClient({
  initialDrafts,
  gmailStatus,
}: {
  initialDrafts: ChannelDraft[];
  gmailStatus: GmailConnectionStatus;
}) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ChannelDraft["status"]>("all");
  const [gmailFilter, setGmailFilter] = useState<"all" | ChannelDraft["gmailSaveStatus"]>("all");
  const [sort, setSort] = useState<SortValue>("updated_desc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState(initialDrafts[0]?.id || null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [gmailSavingId, setGmailSavingId] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ total: 0, processed: 0, success: 0, failed: 0 });

  const visibleDrafts = useMemo(() => {
    const lowered = query.trim().toLowerCase();

    const filtered = drafts.filter((draft) => {
      const matchesQuery =
        !lowered ||
        draft.subject.toLowerCase().includes(lowered) ||
        draft.channelTitle.toLowerCase().includes(lowered) ||
        (draft.email || "").toLowerCase().includes(lowered);
      const matchesStatus = statusFilter === "all" || draft.status === statusFilter;
      const matchesGmail = gmailFilter === "all" || draft.gmailSaveStatus === gmailFilter;

      return matchesQuery && matchesStatus && matchesGmail;
    });

    return filtered.sort((left, right) => {
      if (sort === "created_desc") {
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      }

      if (sort === "subject_asc") {
        return left.subject.localeCompare(right.subject, "ja");
      }

      if (sort === "channel_asc") {
        return left.channelTitle.localeCompare(right.channelTitle, "ja");
      }

      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
  }, [drafts, gmailFilter, query, sort, statusFilter]);

  const activeDraft = drafts.find((draft) => draft.id === activeId) || null;
  const allVisibleSelected =
    visibleDrafts.length > 0 && visibleDrafts.every((draft) => selectedIds.includes(draft.id));

  const summary = useMemo(
    () => ({
      total: drafts.length,
      ready: drafts.filter((draft) => draft.status === "ready_to_send").length,
      reviewed: drafts.filter((draft) => draft.status === "reviewed").length,
      gmailSaved: drafts.filter((draft) => draft.gmailSaveStatus === "saved").length,
    }),
    [drafts],
  );

  function patchDraft(id: string, patch: Partial<ChannelDraft>) {
    setDrafts((current) => current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)));
  }

  function toggleSelection(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? visibleDrafts.map((draft) => draft.id) : []);
  }

  async function handleSaveDraft() {
    if (!activeDraft) {
      return;
    }

    setSavingId(activeDraft.id);
    setMessage("");
    setError("");

    const response = await fetch(`/api/email-drafts/${activeDraft.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: activeDraft.subject,
        body: activeDraft.body,
        status: activeDraft.status,
        personalizationPoints: activeDraft.personalizationPoints,
        usedChannelSignals: activeDraft.usedChannelSignals,
        confidenceNote: activeDraft.confidenceNote,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "下書きの保存に失敗しました。");
      setSavingId(null);
      return;
    }

    patchDraft(activeDraft.id, data.draft);
    setMessage("下書きを更新しました。");
    setSavingId(null);
  }

  async function saveOneToGmail(draftId: string) {
    const response = await fetch("/api/gmail/drafts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        draftIds: [draftId],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Gmail への下書き保存に失敗しました。");
    }

    if (Array.isArray(data.drafts) && data.drafts[0]) {
      patchDraft(draftId, data.drafts[0]);
      return;
    }

    const firstError = Array.isArray(data.errors) ? data.errors[0] : null;
    throw new Error(firstError?.error || "Gmail への下書き保存に失敗しました。");
  }

  async function handleSaveToGmail(draftId: string) {
    if (!gmailStatus.connected) {
      setError("先に Gmail を接続してください。");
      return;
    }

    setGmailSavingId(draftId);
    setMessage("");
    setError("");

    try {
      await saveOneToGmail(draftId);
      setMessage("Gmail に下書きを保存しました。");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Gmail への下書き保存に失敗しました。");
    } finally {
      setGmailSavingId(null);
    }
  }

  async function handleBulkSaveToGmail() {
    if (!gmailStatus.connected) {
      setError("先に Gmail を接続してください。");
      return;
    }

    if (selectedIds.length === 0) {
      return;
    }

    setBulkSaving(true);
    setMessage("");
    setError("");
    setBulkProgress({ total: selectedIds.length, processed: 0, success: 0, failed: 0 });

    for (const draftId of selectedIds) {
      try {
        await saveOneToGmail(draftId);
        setBulkProgress((current) => ({
          total: current.total,
          processed: current.processed + 1,
          success: current.success + 1,
          failed: current.failed,
        }));
      } catch {
        setBulkProgress((current) => ({
          total: current.total,
          processed: current.processed + 1,
          success: current.success,
          failed: current.failed + 1,
        }));
      }
    }

    setMessage("選択した下書きの Gmail 保存処理が完了しました。");
    setBulkSaving(false);
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-[28px] border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">下書き総数</p>
            <p className="mt-3 text-4xl font-semibold text-slate-950">{summary.total}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">確認済み</p>
            <p className="mt-3 text-4xl font-semibold text-slate-950">{summary.reviewed}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">送信前確認OK</p>
            <p className="mt-3 text-4xl font-semibold text-slate-950">{summary.ready}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-slate-200 bg-white shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Gmail 保存済み</p>
            <p className="mt-3 text-4xl font-semibold text-slate-950">{summary.gmailSaved}</p>
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-[28px] border-slate-200 bg-white shadow-sm">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-950">Gmail 接続状態</p>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              {gmailStatus.connected ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <Clock3 className="h-4 w-4 text-slate-400" />
              )}
              <span>{gmailStatus.connected ? "接続済み" : "未接続"}</span>
              {gmailStatus.expiresAt ? <span>有効期限: {formatDateTime(gmailStatus.expiresAt)}</span> : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!gmailStatus.connected ? (
              <Button asChild>
                <a href="/api/gmail/connect?returnTo=/mail-drafts">Gmail を接続</a>
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleBulkSaveToGmail()}
              disabled={!gmailStatus.connected || selectedIds.length === 0 || bulkSaving}
            >
              <Mail className="mr-2 h-4 w-4" />
              {bulkSaving ? "Gmail 保存中..." : `選択を Gmail に保存 (${selectedIds.length})`}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <div className="space-y-4">
          <Card className="rounded-[28px] border-slate-200 bg-white shadow-sm">
            <CardContent className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-5">
              <div className="xl:col-span-2">
                <Label htmlFor="draft-search">検索</Label>
                <Input
                  id="draft-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="件名、宛先、チャンネル名で検索"
                />
              </div>
              <div>
                <Label htmlFor="draft-status-filter">ステータス</Label>
                <select
                  id="draft-status-filter"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                >
                  <option value="all">すべて</option>
                  <option value="draft">draft</option>
                  <option value="reviewed">reviewed</option>
                  <option value="ready_to_send">ready_to_send</option>
                </select>
              </div>
              <div>
                <Label htmlFor="gmail-status-filter">Gmail 保存状態</Label>
                <select
                  id="gmail-status-filter"
                  value={gmailFilter}
                  onChange={(event) => setGmailFilter(event.target.value as typeof gmailFilter)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                >
                  <option value="all">すべて</option>
                  <option value="not_saved">未保存</option>
                  <option value="saved">保存済み</option>
                  <option value="failed">失敗</option>
                </select>
              </div>
              <div>
                <Label htmlFor="draft-sort">並び順</Label>
                <select
                  id="draft-sort"
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortValue)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                >
                  <option value="updated_desc">更新日順</option>
                  <option value="created_desc">作成日順</option>
                  <option value="subject_asc">件名順</option>
                  <option value="channel_asc">チャンネル名順</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {bulkProgress.total > 0 ? (
            <Card className="rounded-[28px] border-slate-200 bg-white shadow-sm">
              <CardContent className="p-5 text-sm text-slate-600">
                進捗 {bulkProgress.processed}/{bulkProgress.total} 件 / 成功 {bulkProgress.success} / 失敗{" "}
                {bulkProgress.failed} / 残り {bulkProgress.total - bulkProgress.processed}
              </CardContent>
            </Card>
          ) : null}

          {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
          {error ? <p className="text-sm text-rose-500">{error}</p> : null}

          <Card className="overflow-hidden rounded-[28px] border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={(event) => toggleAll(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </th>
                    <th className="px-4 py-3">件名</th>
                    <th className="px-4 py-3">宛先</th>
                    <th className="px-4 py-3">チャンネル名</th>
                    <th className="px-4 py-3">ステータス</th>
                    <th className="px-4 py-3">テンプレ</th>
                    <th className="px-4 py-3">Gmail 保存状態</th>
                    <th className="px-4 py-3">作成日時</th>
                    <th className="px-4 py-3">更新日時</th>
                    <th className="px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {visibleDrafts.map((draft) => (
                    <tr
                      key={draft.id}
                      className={cn(
                        "align-top transition hover:bg-slate-50",
                        activeId === draft.id && "bg-blue-50/50",
                      )}
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(draft.id)}
                          onChange={() => toggleSelection(draft.id)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                      </td>
                      <td className="px-4 py-4 font-medium text-slate-900">{draft.subject}</td>
                      <td className="px-4 py-4 text-slate-600">{draft.email || "-"}</td>
                      <td className="px-4 py-4 text-slate-700">{draft.channelTitle}</td>
                      <td className="px-4 py-4">
                        <DraftStatusBadge status={draft.status} />
                      </td>
                      <td className="px-4 py-4 text-slate-600">{draft.templateName || "-"}</td>
                      <td className="px-4 py-4">
                        <GmailStatusBadge status={draft.gmailSaveStatus} />
                      </td>
                      <td className="px-4 py-4 text-slate-500">{formatDateTime(draft.createdAt)}</td>
                      <td className="px-4 py-4 text-slate-500">{formatDateTime(draft.updatedAt)}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" size="sm" variant="secondary" onClick={() => setActiveId(draft.id)}>
                            詳細
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => void handleSaveToGmail(draft.id)}
                            disabled={!gmailStatus.connected || gmailSavingId === draft.id}
                          >
                            {gmailSavingId === draft.id ? "保存中..." : "Gmail 保存"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <Card className="rounded-[28px] border-slate-200 bg-white shadow-sm">
          <CardContent className="space-y-5 p-5">
            {!activeDraft ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-sm text-slate-500">
                編集する下書きを選択してください。
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-slate-950">{activeDraft.channelTitle}</p>
                  <p className="text-sm text-slate-500">{activeDraft.email || "-"}</p>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="draft-subject">件名</Label>
                    <Input
                      id="draft-subject"
                      value={activeDraft.subject}
                      onChange={(event) => patchDraft(activeDraft.id, { subject: event.target.value })}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="draft-body">本文</Label>
                    <Textarea
                      id="draft-body"
                      className="min-h-[220px]"
                      value={activeDraft.body}
                      onChange={(event) => patchDraft(activeDraft.id, { body: event.target.value })}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="draft-status">ステータス</Label>
                    <select
                      id="draft-status"
                      value={activeDraft.status}
                      onChange={(event) =>
                        patchDraft(activeDraft.id, {
                          status: event.target.value as ChannelDraft["status"],
                        })
                      }
                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                    >
                      <option value="draft">draft</option>
                      <option value="reviewed">reviewed</option>
                      <option value="ready_to_send">ready_to_send</option>
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="draft-personalization">personalization_points</Label>
                    <Textarea
                      id="draft-personalization"
                      className="min-h-[100px]"
                      value={activeDraft.personalizationPoints}
                      onChange={(event) =>
                        patchDraft(activeDraft.id, { personalizationPoints: event.target.value })
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>used_channel_signals</Label>
                    <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      {activeDraft.usedChannelSignals.length === 0 ? (
                        <span className="text-sm text-slate-400">なし</span>
                      ) : (
                        activeDraft.usedChannelSignals.map((signal) => (
                          <span
                            key={signal}
                            className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700"
                          >
                            {signal}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="draft-confidence">confidence_note</Label>
                    <Textarea
                      id="draft-confidence"
                      className="min-h-[100px]"
                      value={activeDraft.confidenceNote}
                      onChange={(event) => patchDraft(activeDraft.id, { confidenceNote: event.target.value })}
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    <div>テンプレ: {activeDraft.templateName || "-"}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Gmail 状態 <GmailStatusBadge status={activeDraft.gmailSaveStatus} />
                    </div>
                    {activeDraft.errorMessage ? <div className="mt-2 text-rose-500">{activeDraft.errorMessage}</div> : null}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button type="button" onClick={() => void handleSaveDraft()} disabled={savingId === activeDraft.id}>
                      <Save className="mr-2 h-4 w-4" />
                      {savingId === activeDraft.id ? "保存中..." : "下書きを保存"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void handleSaveToGmail(activeDraft.id)}
                      disabled={!gmailStatus.connected || gmailSavingId === activeDraft.id}
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      {gmailSavingId === activeDraft.id ? "保存中..." : "Gmail に保存"}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
