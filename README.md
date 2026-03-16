# TubeLead

TubeLead は、YouTube チャンネルの発見・営業リスト化・ライバル調査・営業メール下書き作成までをまとめて扱うローカル運用向け MVP です。  
YouTube の取得は公式の YouTube Data API v3 のみを使い、送信処理は持たず、最終送信は人間が行う前提です。

## 概要

TubeLead では次の 3 つの用途を扱えます。

- 営業モード
  - YouTube チャンネル検索
  - 連絡先の抽出と整理
  - CSV 出力
  - AI 営業文面の下書き生成
- ライバル調査モード
  - 競合チャンネル検索
  - 直近動画分析
  - 想定月収 low / base / high 表示
- 営業メール作成
  - CSV 一括取り込み
  - チャンネル単位のメール下書き生成
  - 下書き保存

## 技術スタック

- Next.js 15
- TypeScript
- App Router
- Tailwind CSS
- Prisma
- PostgreSQL
- Zod
- React Hook Form
- route handlers
- OpenAI API

## 重要な方針

- YouTube の HTML はスクレイピングしません
- YouTube の取得は YouTube Data API v3 のみを使います
- 自動 DM 送信、自動メール送信は実装しません
- 営業メールは下書き保存までです
- Vercel では SQLite は使わず PostgreSQL を使います

## 環境変数

`.env.example`

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DBNAME?schema=public"
YOUTUBE_API_KEY=""
OPENAI_API_KEY=""
APP_PLAN="FREE"
NEXT_PUBLIC_APP_NAME="TubeLead"
```

Vercel にも同じキーを設定してください。

- `DATABASE_URL`
- `YOUTUBE_API_KEY`
- `OPENAI_API_KEY`
- `APP_PLAN`
- `NEXT_PUBLIC_APP_NAME`

## YouTube API キーの取得方法

1. [Google Cloud Console](https://console.cloud.google.com/) を開く
2. プロジェクトを作成する
3. YouTube Data API v3 を有効化する
4. API キーを発行する
5. `.env` の `YOUTUBE_API_KEY` に設定する

## OpenAI API キーの設定方法

1. [OpenAI Platform](https://platform.openai.com/) で API キーを発行する
2. `.env` の `OPENAI_API_KEY` に設定する
3. 未設定でもモックやフォールバック文面で画面確認は可能です

## ローカル開発手順

1. 依存関係を入れる

```bash
npm install
```

2. `.env.example` を参考に `.env` を作る

3. DB を準備する

```bash
npm run db:prepare
```

4. 開発サーバーを起動する

```bash
npm run dev
```

## Prisma / PostgreSQL 運用

ローカルでは PostgreSQL を使います。  
Vercel でも SQLite は使えないため、必ず PostgreSQL を使ってください。

よく使うコマンド:

```bash
npm run db:prepare
npm run db:push
npm run db:deploy
npm run db:seed
npm run prisma:generate
```

本番 DB への反映は `prisma migrate deploy` を使います。

```bash
npx prisma migrate deploy
```

## Vercel デプロイ手順

1. PostgreSQL を用意する
2. Vercel Project Settings > Environment Variables に環境変数を設定する
3. GitHub に push する
4. Vercel で再デプロイする
5. 本番 DB に migration を適用する

```bash
npx prisma migrate deploy
```

## 現在できること

### 営業モード

- キーワード検索
- チャンネル一覧保存
- 連絡先抽出
- フィルタと並び替え
- CSV 出力
- 一覧から単体営業メール作成

### ライバル調査モード

- キーワード検索
- 直近動画分析
- 平均再生、投稿頻度、Shorts 比率の表示
- 想定月収 low / base / high の表示
- 一覧 / 詳細での分析確認

### 営業メール作成

- 新規ページ `/mail-builder`
- CSV アップロード
- メールアドレス付き行だけ抽出
- AI で件名 / 本文 / カスタムポイント / 生成理由を作成
- 一括生成
- 1 件ごとの編集
- 一括または個別の下書き保存

### 営業テンプレ設定

- 新規ページ `/mail-templates`
- テンプレ名
- AI への仮プロンプト
- 営業メールの大本
- 保存 / 更新

## 営業メール作成の仕様

### 一括作成

- CSV の `email` / `contactEmail` / `contactEmails` を優先して対象を作ります
- `title` または `channelId` があればチャンネル情報と紐付けます
- 100 件あれば 100 件分まとめて生成できます
- 1 件失敗しても全件は止まりません

### 単体作成

- 一覧管理の営業モードから `営業メール` ボタンで遷移できます
- そのチャンネル 1 件だけを対象に生成できます

### 仮プロンプトの場所

- 営業メール用の仮プロンプト: `src/lib/ai.ts`
- テンプレの保存 / 読み出し: `src/lib/outreach.ts`

## 想定月収の算出方法

ライバル調査モードでは実収益ではなく推定値を表示します。

- 直近 30 日以内の再生数を優先
- 足りない場合は直近 10 本平均と投稿頻度で補完
- low / base / high の 3 段階で表示
- Shorts 比率が高い場合は過大になりにくいよう補正

この値はあくまで推定であり、実収益を保証するものではありません。

## まだできないこと

- 自動送信
- Gmail API 送信
- 認証
- 決済
- チーム共有
- ジョブキューを使った本格的な非同期処理

## 今後追加しやすい機能

- Gmail 下書き連携
- 送信前レビュー承認フロー
- 認証とユーザー分離
- Stripe 課金
- チーム単位の共有
- 本番用の高度なプロンプトへ差し替え

## SaaS 化する場合の次のステップ

1. 認証を追加してユーザー単位でデータ分離する
2. Stripe を入れて FREE / PRO を本物のプラン制御にする
3. ジョブキューで検索・補完・メール生成を非同期化する
4. Gmail 下書き連携を入れる
5. 監査ログとチーム共有を追加する

## よくあるエラーと対処法

- `DATABASE_URL is not set`
  - `.env` または Vercel の Environment Variables を確認してください
- `Prisma Client could not be found`
  - `npm install` または `npx prisma generate` を実行してください
- `prisma migrate deploy` に失敗する
  - 本番 DB の接続文字列と権限を確認してください
- YouTube API キー未設定で検索結果が少ない
  - モックデータ表示になっていないか確認してください

