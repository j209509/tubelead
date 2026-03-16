"use client";

import { Plus, Save } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { OutreachTemplateItem } from "@/lib/channel-types";

export function OutreachTemplateForm({ initialTemplates }: { initialTemplates: OutreachTemplateItem[] }) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [selectedId, setSelectedId] = useState<string | null>(initialTemplates[0]?.id || null);
  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === selectedId) || null,
    [selectedId, templates],
  );
  const [name, setName] = useState(selectedTemplate?.name || "");
  const [basePrompt, setBasePrompt] = useState(selectedTemplate?.basePrompt || "");
  const [baseMailText, setBaseMailText] = useState(selectedTemplate?.baseMailText || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function syncForm(template: OutreachTemplateItem | null) {
    setName(template?.name || "");
    setBasePrompt(template?.basePrompt || "");
    setBaseMailText(template?.baseMailText || "");
  }

  function handleSelect(template: OutreachTemplateItem) {
    setSelectedId(template.id);
    syncForm(template);
    setMessage("");
    setError("");
  }

  function handleCreateNew() {
    setSelectedId(null);
    syncForm(null);
    setMessage("");
    setError("");
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    setError("");

    const payload = {
      name,
      basePrompt,
      baseMailText,
    };

    const response = await fetch(selectedId ? `/api/outreach-templates/${selectedId}` : "/api/outreach-templates", {
      method: selectedId ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "テンプレート保存に失敗しました。");
      setSaving(false);
      return;
    }

    const nextTemplate = data.template as OutreachTemplateItem;
    setTemplates((current) => {
      const exists = current.some((item) => item.id === nextTemplate.id);
      if (exists) {
        return current.map((item) => (item.id === nextTemplate.id ? nextTemplate : item));
      }

      return [nextTemplate, ...current];
    });
    setSelectedId(nextTemplate.id);
    syncForm(nextTemplate);
    setMessage(selectedId ? "テンプレートを更新しました。" : "テンプレートを作成しました。");
    setSaving(false);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="rounded-[28px] border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>テンプレ一覧</CardTitle>
          <CardDescription>営業メールの大本をここで管理します。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button type="button" variant="secondary" className="w-full justify-start" onClick={handleCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            新規テンプレート
          </Button>

          <div className="space-y-2">
            {templates.map((template) => {
              const active = selectedId === template.id;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleSelect(template)}
                  className={
                    active
                      ? "w-full rounded-2xl border border-slate-900 bg-slate-900 px-4 py-4 text-left text-white"
                      : "w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
                  }
                >
                  <p className="font-medium">{template.name}</p>
                  <p className={active ? "mt-1 text-xs text-slate-300" : "mt-1 text-xs text-slate-500"}>
                    更新日 {new Date(template.updatedAt).toLocaleDateString("ja-JP")}
                  </p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>営業テンプレ設定</CardTitle>
          <CardDescription>
            ベース文章とAIへの指示文を保存します。あとから本番用のプロンプトへ差し替えやすいよう、テンプレ部分を分離しています。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="template-name">テンプレ名</Label>
            <Input id="template-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="template-base-prompt">AIへの指示文</Label>
            <Textarea
              id="template-base-prompt"
              value={basePrompt}
              onChange={(event) => setBasePrompt(event.target.value)}
              className="min-h-[180px]"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="template-base-mail-text">営業メールの大本</Label>
            <Textarea
              id="template-base-mail-text"
              value={baseMailText}
              onChange={(event) => setBaseMailText(event.target.value)}
              className="min-h-[260px]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "保存中..." : "テンプレートを保存"}
            </Button>
            {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
            {error ? <p className="text-sm text-rose-500">{error}</p> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
