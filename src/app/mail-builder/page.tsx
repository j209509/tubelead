import Link from "next/link";

import { EmailBuilderClient } from "@/components/outreach/email-builder-client";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import type { EmailGenerationTarget } from "@/lib/channel-types";
import { getOutreachTemplates } from "@/lib/outreach";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getInitialTarget(channelId?: string): Promise<EmailGenerationTarget | null> {
  if (!channelId) {
    return null;
  }

  const select = {
    id: true,
    title: true,
    description: true,
    categoryGuess: true,
    regionGuess: true,
    channelUrl: true,
    subscriberCount: true,
    videoCount: true,
    contactEmail: true,
    bestContactValue: true,
  } as const;

  const channel =
    (await prisma.channel.findUnique({
      where: { id: channelId },
      select,
    })) ||
    (await prisma.channel.findUnique({
      where: { channelId },
      select,
    }));

  if (!channel) {
    return null;
  }

  const email =
    channel.contactEmail ||
    (channel.bestContactValue?.includes("@") ? channel.bestContactValue : null);

  if (!email) {
    return null;
  }

  return {
    channelId: channel.id,
    title: channel.title,
    email,
    description: channel.description,
    categoryGuess: channel.categoryGuess,
    regionGuess: channel.regionGuess,
    channelUrl: channel.channelUrl,
    subscriberCount: channel.subscriberCount,
    videoCount: channel.videoCount,
    sourceType: "single_channel",
  };
}

export default async function MailBuilderPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const channelId = typeof params.channelId === "string" ? params.channelId : undefined;
  const [templates, initialTarget] = await Promise.all([
    getOutreachTemplates(),
    getInitialTarget(channelId),
  ]);

  return (
    <AppShell
      title="営業メール作成"
      description="CSVまたは単体チャンネルから、AIで個別最適化した営業メールをまとめて生成し、下書き保存できます。送信は行わず、最終確認は人間が行う前提です。"
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="secondary">
            <Link href="/mail-templates">営業テンプレ設定</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/channels?mode=sales">一覧管理へ戻る</Link>
          </Button>
        </div>
      }
    >
      <EmailBuilderClient templates={templates} initialTarget={initialTarget} />
    </AppShell>
  );
}
