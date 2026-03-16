"use client";

import { FileUp, Mail, RefreshCw, Save, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EmailGenerationTarget, OutreachTemplateItem } from "@/lib/channel-types";

type BuilderRow = {
  id: string;
  channelId?: string | null;
  channelTitle: string;
  email: string;
  description: string;
  categoryGuess?: string | null;
  regionGuess?: string | null;
  channelUrl?: string | null;
  subscriberCount?: number | null;
  videoCount?: number | null;
  sourceType: "single_channel" | "csv_import";
  status: "idle" | "generating" | "generated" | "saving" | "saved" | "error";
  subject: string;
  body: string;
  customPoint: string;
  rationale: string;
  personalizationPoints: string;
  usedChannelSignals: string[];
  confidenceNote: string;
  error?: string;
  templateId?: string | null;
};

function parseCsv(text: string) {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current);
      if (row.some((cell) => cell.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  row.push(current);
  if (row.some((cell) => cell.trim() !== "")) {
    rows.push(row);
  }

  return rows;
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function pickValue(record: Record<string, string>, candidates: string[]) {
  for (const candidate of candidates) {
    if (record[candidate]) {
      return record[candidate].trim();
    }
  }

  return "";
}

function pickEmail(record: Record<string, string>) {
  const direct = pickValue(record, ["email", "contactemail", "contactmail", "mail", "bestcontactvalue"]);
  if (direct.includes("@")) {
    return direct;
  }

  const contactEmails = pickValue(record, ["contactemails"]);
  if (contactEmails) {
    const matched = contactEmails.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    if (matched) {
      return matched[0];
    }
  }

  return "";
}

function buildRowsFromCsv(text: string): BuilderRow[] {
  const parsed = parseCsv(text);
  if (parsed.length <= 1) {
    return [];
  }

  const headers = parsed[0].map(normalizeHeader);
  const dataRows = parsed.slice(1);

  const mappedRows: Array<BuilderRow | null> = dataRows.map((cells, index) => {
      const record = headers.reduce<Record<string, string>>((acc, header, headerIndex) => {
        acc[header] = cells[headerIndex] || "";
        return acc;
      }, {});
      const email = pickEmail(record);

      if (!email) {
        return null;
      }

      return {
        id: `csv-${index}-${email}`,
        channelId: pickValue(record, ["id", "channelid"]) || null,
        channelTitle:
          pickValue(record, ["title", "channeltitle", "name"]) ||
          pickValue(record, ["channelname"]) ||
          email,
        email,
        description: pickValue(record, ["description"]),
        categoryGuess: pickValue(record, ["categoryguess", "category"]) || null,
        regionGuess: pickValue(record, ["regionguess", "region"]) || null,
        channelUrl: pickValue(record, ["channelurl"]) || null,
        subscriberCount: Number(pickValue(record, ["subscribercount"])) || null,
        videoCount: Number(pickValue(record, ["videocount"])) || null,
        sourceType: "csv_import",
        status: "idle",
        subject: "",
        body: "",
        customPoint: "",
        rationale: "",
        personalizationPoints: "",
        usedChannelSignals: [],
        confidenceNote: "",
      };
    });

  return mappedRows.filter((item): item is BuilderRow => item !== null);
}

function buildSingleChannelRow(target: EmailGenerationTarget): BuilderRow {
  return {
    id: `single-${target.channelId || target.email}`,
    channelId: target.channelId || null,
    channelTitle: target.title,
    email: target.email,
    description: target.description || "",
    categoryGuess: target.categoryGuess || null,
    regionGuess: target.regionGuess || null,
    channelUrl: target.channelUrl || null,
    subscriberCount: target.subscriberCount ?? null,
    videoCount: target.videoCount ?? null,
    sourceType: "single_channel",
    status: "idle",
    subject: "",
    body: "",
    customPoint: "",
    rationale: "",
    personalizationPoints: "",
    usedChannelSignals: [],
    confidenceNote: "",
  };
}

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
        const currentIndex = cursor;
        cursor += 1;
        const item = items[currentIndex];

        if (item !== undefined) {
          await worker(item);
        }
      }
    }),
  );
}

export function EmailBuilderClient({
  templates,
  initialTarget,
}: {
  templates: OutreachTemplateItem[];
  initialTarget?: EmailGenerationTarget | null;
}) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id || "");
  const [rows, setRows] = useState<BuilderRow[]>(initialTarget ? [buildSingleChannelRow(initialTarget)] : []);
  const [csvFileName, setCsvFileName] = useState("");
  const [generationMessage, setGenerationMessage] = useState("");
  const [generationError, setGenerationError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [progress, setProgress] = useState({ processed: 0, success: 0, failed: 0 });

  const selectedTemplate = templates.find((item) => item.id === selectedTemplateId) || null;
  const generatedCount = rows.filter((row) => row.status === "generated" || row.status === "saved").length;
  const saveableRows = rows.filter((row) => row.subject && row.body && row.status !== "saved");

  const summary = useMemo(
    () => ({
      total: rows.length,
      emails: rows.filter((row) => Boolean(row.email)).length,
      generated: rows.filter((row) => row.status === "generated" || row.status === "saved").length,
      saved: rows.filter((row) => row.status === "saved").length,
    }),
    [rows],
  );

  function patchRow(id: string, patch: Partial<BuilderRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const text = await file.text();
    const nextRows = buildRowsFromCsv(text);

    setRows(nextRows);
    setCsvFileName(file.name);
    setGenerationMessage("");
    setGenerationError("");
    setProgress({ processed: 0, success: 0, failed: 0 });
  }

  async function handleGenerate() {
    if (!selectedTemplateId) {
      setGenerationError("テンプレートを選択してください。");
      return;
    }

    if (rows.length === 0) {
      setGenerationError("対象チャンネルがありません。");
      return;
    }

    setIsGenerating(true);
    setGenerationError("");
    setGenerationMessage("");
    setProgress({ processed: 0, success: 0, failed: 0 });

    const targets = rows.filter((row) => row.email);

    await runTasksWithConcurrency(
      targets,
      async (row) => {
        patchRow(row.id, { status: "generating", error: "" });

        const response = await fetch("/api/email-drafts/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            templateId: selectedTemplateId,
            target: {
              channelId: row.channelId,
              title: row.channelTitle,
              email: row.email,
              description: row.description,
              categoryGuess: row.categoryGuess,
              regionGuess: row.regionGuess,
              channelUrl: row.channelUrl,
              subscriberCount: row.subscriberCount,
              videoCount: row.videoCount,
              sourceType: row.sourceType,
            },
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          patchRow(row.id, {
            status: "error",
            error: data.error || "営業メール生成に失敗しました。",
          });
          setProgress((current) => ({
            processed: current.processed + 1,
            success: current.success,
            failed: current.failed + 1,
          }));
          return;
        }

        patchRow(row.id, {
          status: "generated",
          channelId: data.draft.channelId,
          channelTitle: data.draft.channelTitle,
          email: data.draft.email,
          subject: data.draft.subject,
          body: data.draft.body,
          customPoint: data.draft.customPoint,
          rationale: data.draft.rationale,
          personalizationPoints: data.draft.personalizationPoints || data.draft.customPoint || "",
          usedChannelSignals: data.draft.usedChannelSignals || [],
          confidenceNote: data.draft.confidenceNote || data.draft.rationale || "",
          templateId: data.draft.templateId,
          error: "",
        });

        setProgress((current) => ({
          processed: current.processed + 1,
          success: current.success + 1,
          failed: current.failed,
        }));
      },
      3,
    );

    setGenerationMessage("営業メールの生成が完了しました。件名と本文を確認してから下書き保存できます。");
    setIsGenerating(false);
  }

  async function handleSaveRow(row: BuilderRow) {
    patchRow(row.id, { status: "saving", error: "" });

    const response = await fetch("/api/email-drafts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        drafts: [
          {
            channelId: row.channelId,
            channelTitle: row.channelTitle,
            email: row.email,
            subject: row.subject,
            body: row.body,
            status: "draft",
            sourceType: row.sourceType,
            templateId: row.templateId || selectedTemplateId || null,
            customPoint: row.customPoint,
            rationale: row.rationale,
            personalizationPoints: row.personalizationPoints,
            usedChannelSignals: row.usedChannelSignals,
            confidenceNote: row.confidenceNote,
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok || !Array.isArray(data.drafts) || data.drafts.length === 0) {
      const saveError =
        Array.isArray(data.errors) && data.errors.length > 0
          ? data.errors[0]?.error
          : data.error || "下書き保存に失敗しました。";
      patchRow(row.id, {
        status: "error",
        error: saveError,
      });
      return;
    }

    patchRow(row.id, { status: "saved", error: "" });
  }

  async function handleSaveAll() {
    if (saveableRows.length === 0) {
      return;
    }

    setIsSavingAll(true);
    setGenerationError("");
    setGenerationMessage("");

    const response = await fetch("/api/email-drafts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        drafts: saveableRows.map((row) => ({
          channelId: row.channelId,
          channelTitle: row.channelTitle,
          email: row.email,
          subject: row.subject,
          body: row.body,
          status: "draft",
          sourceType: row.sourceType,
          templateId: row.templateId || selectedTemplateId || null,
          customPoint: row.customPoint,
          rationale: row.rationale,
          personalizationPoints: row.personalizationPoints,
          usedChannelSignals: row.usedChannelSignals,
          confidenceNote: row.confidenceNote,
        })),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setGenerationError(data.error || "一括保存に失敗しました。");
      setIsSavingAll(false);
      return;
    }

    const savedDrafts = Array.isArray(data.drafts) ? data.drafts : [];
    const saveErrors = Array.isArray(data.errors) ? data.errors : [];
    const savedKeySet = new Set(
      savedDrafts.map((draft: { channelTitle: string; email: string | null; subject: string }) =>
        `${draft.channelTitle}::${draft.email || ""}::${draft.subject}`,
      ),
    );

    setRows((current) =>
      current.map((row) => {
        const key = `${row.channelTitle}::${row.email || ""}::${row.subject}`;
        const matchedError = saveErrors.find(
          (item: { channelTitle: string; email?: string | null; error: string }) =>
            item.channelTitle === row.channelTitle && (item.email || "") === (row.email || ""),
        );

        if (savedKeySet.has(key)) {
          return { ...row, status: "saved", error: "" };
        }

        if (matchedError) {
          return { ...row, status: "error", error: matchedError.error };
        }

        return row;
      }),
    );

    if (saveErrors.length > 0) {
      setGenerationMessage(
        `${savedDrafts.length}件を下書き保存しました。${saveErrors.length}件は保存に失敗したため、行ごとのエラーを確認してください。`,
      );
    } else {
      setGenerationMessage("生成済みメールを一括で下書き保存しました。");
    }

    setIsSavingAll(false);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <div className="space-y-6">
        <Card className="rounded-[28px] border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>営業メール作成</CardTitle>
                <CardDescription>
                  CSVまたは単体チャンネルから営業メールをまとめて生成できます。まずは件名と本文を作成し、確認後に下書き保存します。
                </CardDescription>
              </div>
              <Button asChild variant="secondary">
                <Link href="/mail-templates">テンプレ設定</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="template-select">使用テンプレート</Label>
              <select
                id="template-select"
                value={selectedTemplateId}
                onChange={(event) => setSelectedTemplateId(event.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              {selectedTemplate ? (
                <p className="text-sm text-slate-500">
                  指示文: {selectedTemplate.basePrompt.slice(0, 90)}
                  {selectedTemplate.basePrompt.length > 90 ? "..." : ""}
                </p>
              ) : null}
            </div>

            <div className="grid gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                <FileUp className="h-4 w-4" />
                CSVアップロード
              </div>
              <p className="text-sm leading-6 text-slate-500">
                `email` / `contactEmail` / `contactEmails` と、`title` または `channelId` を含む CSV を読み込みます。
              </p>
              <Input type="file" accept=".csv,text/csv" onChange={handleFileChange} />
              {csvFileName ? <p className="text-sm text-slate-600">読み込み中のCSV: {csvFileName}</p> : null}
            </div>

            {initialTarget ? (
              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-900">
                  <Mail className="h-4 w-4" />
                  単体チャンネル生成
                </div>
                <p className="mt-2 text-sm text-blue-900">{initialTarget.title}</p>
                <p className="text-sm text-blue-700">{initialTarget.email}</p>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">対象件数</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{summary.total}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">メールあり</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{summary.emails}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">生成済み</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{generatedCount}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">保存済み</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{summary.saved}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" onClick={handleGenerate} disabled={isGenerating || rows.length === 0}>
                <Sparkles className="mr-2 h-4 w-4" />
                {isGenerating ? "営業メール生成中..." : "営業メールを生成"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleSaveAll}
                disabled={isSavingAll || saveableRows.length === 0}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSavingAll ? "保存中..." : "生成済みを一括保存"}
              </Button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              進捗: {progress.processed}/{rows.length} 件 / 成功 {progress.success} / 失敗 {progress.failed}
            </div>

            {generationMessage ? <p className="text-sm text-emerald-600">{generationMessage}</p> : null}
            {generationError ? <p className="text-sm text-rose-500">{generationError}</p> : null}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[28px] border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>生成プレビュー</CardTitle>
          <CardDescription>
            件名と本文を1件ずつ確認できます。必要に応じて編集してから下書き保存してください。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-sm leading-7 text-slate-500">
              CSVをアップロードするか、「営業メール」ボタンから単体チャンネルを開くと対象チャンネルがここに並びます。
            </div>
          ) : null}

          {rows.map((row) => (
            <div key={row.id} className="rounded-[24px] border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-950">{row.channelTitle}</p>
                  <p className="text-sm text-slate-500">{row.email}</p>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">{row.status}</div>
              </div>

              <div className="mt-4 grid gap-3">
                <Input
                  value={row.subject}
                  onChange={(event) => patchRow(row.id, { subject: event.target.value })}
                  placeholder="件名"
                />
                <Textarea
                  value={row.body}
                  onChange={(event) => patchRow(row.id, { body: event.target.value })}
                  className="min-h-[180px]"
                  placeholder="本文"
                />
              </div>

              {row.customPoint ? (
                <p className="mt-3 text-sm text-slate-600">
                  <span className="font-medium text-slate-900">カスタムポイント:</span> {row.customPoint}
                </p>
              ) : null}
              {row.rationale ? (
                <p className="mt-2 text-sm text-slate-500">
                  <span className="font-medium text-slate-700">生成理由:</span> {row.rationale}
                </p>
              ) : null}
              {row.error ? <p className="mt-2 text-sm text-rose-500">{row.error}</p> : null}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => handleSaveRow(row)}
                  disabled={!row.subject || !row.body || row.status === "saving" || row.status === "saved"}
                >
                  {row.status === "saving" ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      下書き保存
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
