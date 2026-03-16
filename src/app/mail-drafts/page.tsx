import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { MailDraftsClient } from "@/components/outreach/mail-drafts-client";
import { Button } from "@/components/ui/button";
import { getGmailConnectionStatus } from "@/lib/gmail";
import { getOutreachDrafts } from "@/lib/outreach";

export const dynamic = "force-dynamic";

export default async function MailDraftsPage() {
  const [drafts, gmailStatus] = await Promise.all([getOutreachDrafts(), getGmailConnectionStatus()]);

  return (
    <AppShell
      title="下書き一覧"
      description="保存済みの営業メール下書きを一覧管理できます。内容の編集、ステータス更新、Gmail への下書き保存までここで行えます。送信は行わず、最終送信は Gmail 上で人間が行います。"
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="secondary">
            <Link href="/mail-builder">営業メール作成</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/mail-templates">営業テンプレ設定</Link>
          </Button>
          {!gmailStatus.connected ? (
            <Button asChild>
              <a href="/api/gmail/connect?returnTo=/mail-drafts">Gmail を接続</a>
            </Button>
          ) : null}
        </div>
      }
    >
      <MailDraftsClient initialDrafts={drafts} gmailStatus={gmailStatus} />
    </AppShell>
  );
}
