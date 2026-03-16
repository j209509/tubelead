import Link from "next/link";

import { OutreachTemplateForm } from "@/components/outreach/outreach-template-form";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { getOutreachTemplates } from "@/lib/outreach";

export const dynamic = "force-dynamic";

export default async function MailTemplatesPage() {
  const templates = await getOutreachTemplates();

  return (
    <AppShell
      title="営業テンプレ設定"
      description="営業メールの大本となる文章とAI向けの指示文を管理します。あとで本番用プロンプトに差し替えやすいよう、テンプレートを分離して保存します。"
      actions={
        <Button asChild variant="secondary">
          <Link href="/mail-builder">営業メール作成へ</Link>
        </Button>
      }
    >
      <OutreachTemplateForm initialTemplates={templates} />
    </AppShell>
  );
}
