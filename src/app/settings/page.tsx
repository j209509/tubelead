import { AppShell } from "@/components/layout/app-shell";
import { SettingsForm } from "@/components/settings/settings-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getAppSettings();

  return (
    <AppShell
      title="AI設定"
      description="営業文面のテンプレートと、検索・動画補完・外部サイト走査の安全設定を管理できます。"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <SettingsForm initialSettings={settings} />
        <Card>
          <CardHeader>
            <CardTitle>補足</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-slate-600">
            <p>OpenAI APIキーが未設定でも、ダミーの営業文面生成で画面確認できます。</p>
            <p>`searchMaxPages` と `searchQuotaBudgetPerRun` は、1回の検索で使うクォータ上限の目安です。</p>
            <p>外部サイト走査は robots.txt を尊重し、レート制限とタイムアウトを設定して安全寄りに動かします。</p>
            <p>query expansion は将来の拡張用スイッチとして残しています。現状は検索本体では使っていません。</p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
