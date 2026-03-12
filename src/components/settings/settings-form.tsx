"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LENGTH_LABELS, PLAN_LABELS, TONE_LABELS } from "@/lib/constants";
import type { SettingsInput } from "@/lib/schemas";
import type { SerializedSettings } from "@/lib/settings";

export function SettingsForm({ initialSettings }: { initialSettings: SerializedSettings }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const form = useForm<SettingsInput>({
    defaultValues: initialSettings,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setMessage("");
    setError("");

    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "設定の保存に失敗しました。");
      return;
    }

    form.reset(data);
    setMessage("設定を保存しました。");
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>営業文面と検索設定</CardTitle>
        <CardDescription>現在のプランは {PLAN_LABELS[initialSettings.currentPlan]} です。</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-6" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="serviceName">サービス名</Label>
            <Input id="serviceName" {...form.register("serviceName")} />
            <p className="text-xs text-rose-500">{form.formState.errors.serviceName?.message}</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="serviceDescription">サービス説明</Label>
            <Textarea id="serviceDescription" {...form.register("serviceDescription")} />
            <p className="text-xs text-rose-500">{form.formState.errors.serviceDescription?.message}</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="defaultPitch">提案したい内容</Label>
            <Textarea id="defaultPitch" {...form.register("defaultPitch")} />
            <p className="text-xs text-rose-500">{form.formState.errors.defaultPitch?.message}</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="tone">文体</Label>
              <select
                id="tone"
                className="h-11 rounded-xl border border-slate-200 bg-white/90 px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                {...form.register("tone")}
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
                className="h-11 rounded-xl border border-slate-200 bg-white/90 px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                {...form.register("lengthPreference")}
              >
                {Object.entries(LENGTH_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="searchMaxPages">searchMaxPages</Label>
              <Input id="searchMaxPages" type="number" min={1} max={50} {...form.register("searchMaxPages")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="searchQuotaBudgetPerRun">searchQuotaBudgetPerRun</Label>
              <Input
                id="searchQuotaBudgetPerRun"
                type="number"
                min={100}
                max={10000}
                {...form.register("searchQuotaBudgetPerRun")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="videosPerChannelForContactScan">videosPerChannelForContactScan</Label>
              <Input
                id="videosPerChannelForContactScan"
                type="number"
                min={1}
                max={10}
                {...form.register("videosPerChannelForContactScan")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="externalSiteMaxUrlsPerChannel">externalSiteMaxUrlsPerChannel</Label>
              <Input
                id="externalSiteMaxUrlsPerChannel"
                type="number"
                min={0}
                max={10}
                {...form.register("externalSiteMaxUrlsPerChannel")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="externalSiteRateLimitMs">externalSiteRateLimitMs</Label>
              <Input
                id="externalSiteRateLimitMs"
                type="number"
                min={0}
                max={10000}
                {...form.register("externalSiteRateLimitMs")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="externalSiteTimeoutMs">externalSiteTimeoutMs</Label>
              <Input
                id="externalSiteTimeoutMs"
                type="number"
                min={1000}
                max={30000}
                {...form.register("externalSiteTimeoutMs")}
              />
            </div>
          </div>

          <div className="grid gap-3">
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300" {...form.register("queryExpansionEnabled")} />
              queryExpansionEnabled
            </label>
            <p className="text-xs text-slate-500">
              将来の検索拡張用スイッチです。現状の検索本体では使っていません。
            </p>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300" {...form.register("externalSiteScanEnabled")} />
              externalSiteScanEnabled
            </label>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "保存中..." : "設定を保存"}
            </Button>
            {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
            {error ? <p className="text-sm text-rose-500">{error}</p> : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
