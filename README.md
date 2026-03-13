# TubeLead

TubeLead は、YouTube チャンネル検索をもとに営業リスト作成とライバル調査を行う Next.js + Prisma アプリです。  
YouTube の取得は公式の YouTube Data API v3 のみを使い、HTML スクレイピングは行いません。

## 概要

- 営業モード
  - チャンネル検索
  - 連絡先候補の整理
  - AI 営業文面の下書き生成
- ライバル調査モード
  - 競合チャンネルの一覧化
  - 直近動画分析
  - 想定月収 low / base / high の推定表示

## 重要な変更

Vercel では SQLite のローカルファイル DB は使えないため、TubeLead は `Prisma + PostgreSQL` 前提に変更しました。  
本番では Vercel の Environment Variables に PostgreSQL の `DATABASE_URL` を設定してください。

## 環境変数

`.env.example`

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DBNAME?schema=public"
YOUTUBE_API_KEY=""
OPENAI_API_KEY=""
APP_PLAN="FREE"
NEXT_PUBLIC_APP_NAME="TubeLead"
```

Vercel に設定する値:

- `DATABASE_URL`
- `YOUTUBE_API_KEY`
- `OPENAI_API_KEY`
- `APP_PLAN`
- `NEXT_PUBLIC_APP_NAME`

## PostgreSQL について

- ローカルでも本番でも PostgreSQL を使います
- Supabase / Neon / Railway / Vercel Marketplace の Postgres などを利用できます
- `DATABASE_URL` には Prisma 用の接続文字列を設定してください
- `schema=public` を付ける前提です

## Prisma 運用

このリポジトリは Prisma Migrate 前提です。

- ローカル開発
  - `npx prisma migrate dev`
- 本番反映
  - `npx prisma migrate deploy`
- Prisma Client 生成
  - `npm install` 時の `postinstall`
  - `npm run build` の中でも実行

含まれている主なスクリプト:

```bash
npm run dev
npm run build
npm run lint
npm run db:prepare
npm run db:push
npm run db:deploy
npm run db:reset
npm run db:seed
```

## ローカル開発手順

1. PostgreSQL を用意する
2. `.env.example` を参考に `.env` を作る
3. `DATABASE_URL` を PostgreSQL に向ける
4. 依存関係を入れる
5. migration を適用して seed を入れる
6. 開発サーバーを起動する

```bash
npm install
npm run db:prepare
npm run dev
```

## Vercel デプロイ手順

1. PostgreSQL を作成する
2. Vercel Project Settings > Environment Variables に必要な値を入れる
3. GitHub に push する
4. Vercel で再デプロイする
5. 初回デプロイ後に本番 DB へ migration を適用する

本番 migration:

```bash
npx prisma migrate deploy
```

Vercel 上で自動実行したい場合は、CI かデプロイ後ジョブで上記コマンドを走らせてください。

## 今できること

- YouTube Data API v3 でのチャンネル検索
- ローカル保存と一覧管理
- 営業モードとライバル調査モードの切り替え
- 直近動画分析
- 想定月収の推定表示
- AI 下書き生成
- CSV エクスポート
- モックデータ seed

## 今できないこと

- 認証
- 決済
- 自動 DM 送信
- 自動メール送信
- JavaScript 描画依存の外部フォーム完全解析

## よくあるエラーと対処法

- `DATABASE_URL is not set`
  - `.env` または Vercel の Environment Variables に PostgreSQL の接続文字列を設定してください
- `Vercel does not support SQLite file databases`
  - `DATABASE_URL` が `file:./dev.db` のままです。PostgreSQL に変更してください
- `Prisma Client could not be found`
  - `npm install` をやり直すか、`npx prisma generate` を実行してください
- `prisma migrate deploy` で失敗する
  - 本番 DB の接続先が正しいか、migration ファイルがデプロイ対象に含まれているか確認してください
- ローカルで起動できない
  - PostgreSQL が起動しているか、`DATABASE_URL` のユーザー名・パスワード・DB 名が正しいか確認してください

## 補足

- Vercel では SQLite ではなく PostgreSQL が必須です
- 本番 DB の schema 反映は `prisma migrate deploy` を使ってください
- YouTube API キー未設定時は一部モック動作で画面確認できますが、DB 自体は PostgreSQL が必要です
