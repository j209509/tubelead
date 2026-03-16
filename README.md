# TubeLead

TubeLead は、YouTube チャンネルの営業リスト作成とライバル調査を行うためのローカル運用向け SaaS MVP です。  
YouTube Data API v3 を使ってチャンネルを収集し、営業向けの連絡先整理、競合分析、営業メール下書き作成までを一つの画面群で扱えます。

## 概要

TubeLead では現在、次の 4 つの流れを扱えます。

- 営業モード
  - チャンネル検索
  - 連絡先抽出
  - 一覧管理
  - CSV 出力
  - AI 営業文面の下書き生成
- ライバル調査モード
  - チャンネル検索
  - 直近動画分析
  - 想定月収の推定
  - 一覧比較
- 営業メール作成
  - CSV 一括読み込み
  - AI による件名・本文生成
  - 下書き保存
- 下書き管理
  - 下書き一覧
  - 内容編集
  - Gmail 下書き保存

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
- Gmail API

## 重要な方針

- YouTube の HTML はスクレイピングしません
- YouTube の取得は YouTube Data API v3 のみを使います
- 自動 DM 送信、自動メール送信は実装しません
- 営業メールは下書き生成と Gmail 下書き保存までです
- 最終送信は人間が Gmail 上で行う前提です
- Vercel では SQLite は使わず PostgreSQL を使います

## 環境変数

`.env.example`

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DBNAME?schema=public"
YOUTUBE_API_KEY=""
OPENAI_API_KEY=""
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
APP_PLAN="FREE"
NEXT_PUBLIC_APP_NAME="TubeLead"
```

Vercel に設定する環境変数:

- `DATABASE_URL`
- `YOUTUBE_API_KEY`
- `OPENAI_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
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
3. 未設定でもモックまたはフォールバック文面で動作します

## Gmail OAuth の設定方法

TubeLead では Gmail API の `drafts.create` を使って Gmail 下書き保存のみを行います。  
送信 API は実装していません。

### Google Cloud 側で必要な設定

1. [Google Cloud Console](https://console.cloud.google.com/) で対象プロジェクトを開く
2. `Gmail API` を有効化する
3. `OAuth 同意画面` を設定する
4. `認証情報` から `OAuth クライアント ID` を作成する
5. アプリ種別は `ウェブアプリケーション` を選ぶ
6. 承認済みのリダイレクト URI に次を追加する
   - ローカル: `http://localhost:3000/api/gmail/callback`
   - Vercel: `https://YOUR_DOMAIN/api/gmail/callback`
7. 発行された Client ID / Client Secret を環境変数へ設定する

### 必要な環境変数

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### 使用するスコープ

- `https://www.googleapis.com/auth/gmail.compose`

このスコープで Gmail の下書き保存のみを行います。送信は行いません。

## ローカル開発手順

1. パッケージを入れる

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

ローカルでも本番でも PostgreSQL を使います。

利用するコマンド:

```bash
npm run db:prepare
npm run db:push
npm run db:deploy
npm run db:seed
npm run prisma:generate
```

本番 DB 反映には `prisma migrate deploy` を使います。

```bash
npx prisma migrate deploy
```

## Vercel デプロイ手順

1. PostgreSQL を用意する
2. Vercel の Project Settings > Environment Variables に必要な環境変数を設定する
3. GitHub に push する
4. Vercel で再デプロイする
5. 本番 DB に migration を適用する

```bash
npx prisma migrate deploy
```

## 今できること

### 営業モード

- キーワードでチャンネル検索
- チャンネル一覧表示
- 連絡先候補抽出
- タグ、メモ、ステータス管理
- CSV 出力
- 1件ずつ AI 営業文面を生成

### ライバル調査モード

- キーワードでチャンネル検索
- 直近動画の平均再生、投稿頻度、Shorts 比率を表示
- 想定月収を low / base / high で表示
- 一覧と詳細で比較

### 営業メール作成

- 新規ページ `/mail-builder`
- CSV アップロード
- メールアドレス付き行の抽出
- AI で件名・本文・カスタムポイント・生成理由を作成
- 1件ずつ編集
- 一括または個別で下書き保存

### 営業テンプレ設定

- 新規ページ `/mail-templates`
- テンプレの作成と更新
- ベースの営業文面と AI 指示文の管理

### 下書き一覧

- 新規ページ `/mail-drafts`
- 保存済み OutreachDraft の一覧管理
- 件名、宛先、チャンネル名、ステータス、テンプレ名、Gmail 保存状態の確認
- 件名・本文・personalization_points・confidence_note の編集
- 個別 Gmail 下書き保存
- 複数選択での一括 Gmail 下書き保存

## 下書き一覧ページの使い方

1. `/mail-builder` で営業メールを生成して下書き保存する
2. `/mail-drafts` を開く
3. 上部の検索、ステータス、Gmail 保存状態で絞り込む
4. 左の一覧で編集したい下書きを選ぶ
5. 右の編集パネルで件名・本文を確認、修正する
6. `下書きを保存` でアプリ内 DB に更新する
7. `Gmail に保存` で Gmail 下書きへ保存する

## Gmail 下書き保存までのユーザーフロー

1. `/mail-builder` で営業メールを作成する
2. `下書き保存` でアプリ内に保存する
3. `/mail-drafts` を開く
4. まだ Gmail 未接続なら `Gmail を接続` を押す
5. Google OAuth を完了する
6. 下書き一覧で 1件ずつまたは複数選択して `Gmail に保存` を押す
7. Gmail 側に下書きが作成される
8. 最終確認と送信は Gmail 上で人間が行う

## 仮プロンプトの場所

- 営業メール生成の仮プロンプト: `src/lib/ai.ts`
- テンプレの保存・取得: `src/lib/outreach.ts`
- Gmail 下書き保存処理: `src/lib/gmail.ts`

## 今回まだやっていないこと

- 自動送信
- Gmail API 送信
- 返信管理
- フォローアップ自動化
- 開封計測
- 複数 Gmail アカウント切替
- チーム共有
- Stripe
- 多ユーザー認証

## 将来追加予定

- Gmail 送信前レビューの強化
- 送信履歴と返信管理
- 認証とユーザー別データ分離
- Stripe 連携
- ジョブキューによる大量生成・大量保存の非同期化

## よくあるエラーと対処法

- `DATABASE_URL is not set`
  - `.env` または Vercel の Environment Variables を確認してください
- `Prisma Client could not be found`
  - `npm install` または `npx prisma generate` を実行してください
- `prisma migrate deploy` に失敗する
  - 本番 DB の接続先と権限を確認してください
- Gmail 接続で失敗する
  - Google Cloud の OAuth Client ID / Secret と Redirect URI を確認してください
- Gmail 下書き保存で失敗する
  - Google OAuth の接続状態と Gmail API 有効化を確認してください
