"use client";

import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type UpgradeDialogProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerLabel?: string;
  title?: string;
  description?: string;
};

export function UpgradeDialog({
  open,
  onOpenChange,
  triggerLabel,
  title = "Proプランで制限を解除",
  description = "無料版では一覧表示 10 件、CSV 10 件、AI 下書き 3 件までです。Pro に切り替えると全件表示と全件CSV、AI生成上限の解除を確認できます。",
}: UpgradeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {triggerLabel ? (
        <DialogTrigger asChild>
          <Button variant="default">{triggerLabel}</Button>
        </DialogTrigger>
      ) : null}
      <DialogContent>
        <DialogHeader>
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <Sparkles className="h-5 w-5" />
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="mt-6 space-y-4 text-sm text-slate-600">
          <div className="rounded-2xl bg-slate-50 p-4">
            開発用では `.env` の `APP_PLAN=PRO` に変更すると、Pro モードへ切り替えられます。
          </div>
          <ul className="space-y-2">
            <li>一覧表示: 全件表示</li>
            <li>CSV出力: 現在のフィルタ結果を全件出力</li>
            <li>AI下書き: 件数制限なしで生成・保存</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
