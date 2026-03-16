import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { OutreachTemplateForm } from "@/components/outreach/outreach-template-form";
import { Button } from "@/components/ui/button";
import { getOutreachTemplates } from "@/lib/outreach";

export const dynamic = "force-dynamic";

export default async function MailTemplatesPage() {
  const templates = await getOutreachTemplates();

  return (
    <AppShell
      title="営業テンプレ設定"
      description="営業メールの大本となる文章と、AI に渡す生成方針を管理します。あとで本番プロンプトへ差し替えやすいよう、テンプレ単位で保存・更新できます。"
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="secondary">
            <Link href="/mail-builder">営業メール作成へ</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/mail-drafts">下書き一覧へ</Link>
          </Button>
        </div>
      }
    >
      <OutreachTemplateForm initialTemplates={templates} />
    </AppShell>
  );
}
