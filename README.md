# TubeLead0312

TubeLead は、YouTubeチャンネル検索をもとに営業リスト作成とライバル調査を行えるローカルMVPです。  
YouTube の取得は [YouTube Data API v3](https://developers.google.com/youtube/v3) のみを使い、YouTube HTML の直接スクレイピングは行いません。

## 概要

TubeLead には 2 つの使い方があります。

- 営業モード
  - 関連チャンネルを探す
  - 連絡先を整理する
  - AI営業文面の下書きを保存する
- ライバル調査モード
  - 競合チャンネルを探す
  - 直近動画の強さや投稿頻度を比較する
  - 想定月収を推定表示する

検索直後は基本情報だけを高速表示し、その後に動画分析を順次補完します。

- stage 1: basic search
  - `search.list`
  - `channels.list`
  - 基本情報を即保存・即表示
- stage 2: light enrichment
  - チャンネル概要欄の抽出
  - 最新動画 2〜3 本の概要欄走査
  - 動画分析と想定月収の計算
  - 一覧表示後に順次反映
- stage 3: deep enrichment
  - 外部サイト走査
  - `contact` / `about` / `company` などの探索
  - 手動ボタン実行のみ

## セットアップ手順

```bash
npm install
npx prisma generate
npm run db:prepare
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## 環境変数

`.env.example`

```env
DATABASE_URL="file:./dev.db"
YOUTUBE_API_KEY=""
OPENAI_API_KEY=""
APP_PLAN="FREE"
NEXT_PUBLIC_APP_NAME="TubeLead"
```

- `DATABASE_URL`
  - Prisma / SQLite 用
- `YOUTUBE_API_KEY`
  - YouTube Data API v3 用
  - 未設定時はモックデータで動作確認可能
- `OPENAI_API_KEY`
  - AI営業文面と AI分析コメント用
  - 未設定時はダミー結果を返す
- `APP_PLAN`
  - `FREE` または `PRO`
- `NEXT_PUBLIC_APP_NAME`
  - 画面表示用アプリ名

## YouTube APIキーの取得方法

1. [Google Cloud Console](https://console.cloud.google.com/) を開く
2. プロジェクトを作成する
3. `YouTube Data API v3` を有効化する
4. 認証情報から API キーを作成する
5. `.env` の `YOUTUBE_API_KEY` に設定する

## OpenAI APIキーの設定方法

1. [OpenAI Platform](https://platform.openai.com/) で API キーを発行する
2. `.env` の `OPENAI_API_KEY` に設定する

未設定でも営業文面と分析コメントはダミー文面で動きます。

## 起動方法

開発:

```bash
npm run dev
```

Lint:

```bash
npm run lint
```

Build:

```bash
npm run build
```

DB更新:

```bash
npm run db:prepare
```

## 検索上限の考え方

検索件数は 100 件固定ではなく、`nextPageToken` を使って次ページがある限り取得できます。  
ただし無制限ではなく、設定で安全側に制御しています。

- `searchMaxPages`
  - 1 回の検索で最大何ページまで取得するか
- `searchQuotaBudgetPerRun`
  - 1 回の検索で使うクォータ予算

初期値は以下です。

- `searchMaxPages = 6`
- `searchQuotaBudgetPerRun = 600`

## クォータ消費の考え方

基本的な目安です。

- `search.list`
  - 1 リクエストあたり 100
- `channels.list`
  - 50件まとめ取得ごとに 1
- `playlistItems.list`
  - light enrichment で使用
- `videos.list`
  - light enrichment で使用

検索本体はまず `search.list + channels.list` だけで返すため、体感速度を優先しています。

## query expansion の仕様

`queryExpansionEnabled` は将来の拡張用設定です。  
現状の検索本体では使っていません。

理由:

- まずは即表示を優先するため
- query expansion は後から ON/OFF できる形だけ先に残しているため

## latest videos scan の仕様

light enrichment では、各チャンネルの最新動画を数本だけ取得して分析します。

- 初期値は `videosPerChannelForContactScan = 3`
- 最大 10 本まで設定可能
- 取得項目
  - `videoId`
  - `title`
  - `description`
  - `publishedAt`
  - `viewCount`
  - `likeCount`
  - `commentCount`
  - `durationSec`
  - `isShorts`
  - `thumbnailUrl`

ここから以下を計算します。

- 直近10本平均再生数
- 直近10本中央値
- 直近30日投稿本数
- 直近90日投稿本数
- Shorts率
- audienceHealthScore
- consistencyScore
- hitDependencyScore
- competitionScore
- growthScore
- opportunityScore
- 推定月間再生数
- 想定月収 low / base / high

## external site scan の仕様

deep enrichment は自動では走りません。  
一覧や詳細の「連絡先詳細検索」実行時のみ動きます。

探索対象の代表例:

- `/`
- `/contact`
- `/about`
- `/company`
- `/inquiry`
- `/contact-us`
- `/profile`
- `/shop`

抽出対象:

- `siteEmails`
- `contactFormUrls`
- `socialLinks`
- `companyNameGuess`
- `addressGuess`
- `phoneGuess`

## robots.txt 尊重について

外部サイト走査では `robots.txt` を確認し、禁止されているパスは取得しません。  
また、以下を設定で制御しています。

- レート制限
- タイムアウト
- チャンネルごとの外部URL上限

## 連絡先抽出の優先順位

`bestContactMethod` は次の優先順位で決めています。

1. `email`
2. `form`
3. `official_site`
4. `instagram`
5. `x`
6. `tiktok`
7. `linktree`
8. `none`

## ライバル調査モードの概要

ライバル調査モードでは、連絡先よりも分析指標を優先表示します。

- 直近10本平均再生数
- 直近10本再生中央値
- 直近30日投稿本数
- 投稿頻度ランク
- 再生/登録者比
- Shorts率
- 推定月間再生数
- 想定月収 low / base / high
- 競合度スコア
- 成長性スコア
- 参入魅力度スコア

## 想定月収の算出方法

想定月収は実収益ではなく推定値です。

### 推定月間再生数

次の順で計算しています。

1. 直近30日以内の動画の再生数合計を優先
2. 直近30日動画が少ない場合は、直近10本平均再生数と投稿頻度で補完

### 想定月収

月間再生数に対して、1再生あたりの仮定単価を掛けています。

- `low = monthlyViews * 0.1円`
- `base = monthlyViews * 0.3円`
- `high = monthlyViews * 0.7円`

ただし Shorts率が高いチャンネルは、過大評価しないように係数を弱めています。

## 推定値であり実収益ではないこと

画面上の想定月収は、あくまで参考用の推定です。  
実際の収益は以下で大きく変わります。

- ジャンル
- 視聴国
- 再生維持率
- 広告単価
- 案件収益の有無

## 直近動画分析の概要

直近動画から、次のような見方ができます。

- 最近も投稿が止まっていないか
- Shorts依存かロング主体か
- 再生が安定しているか
- 1本だけ突出していないか
- 登録者に対して再生が弱すぎないか

## 今回追加された指標一覧

- `monthlyViewsEstimate`
- `estimatedMonthlyIncomeLow`
- `estimatedMonthlyIncomeBase`
- `estimatedMonthlyIncomeHigh`
- `avgViewsLast10`
- `medianViewsLast10`
- `postsLast30`
- `postsLast90`
- `shortsRatio`
- `audienceHealthScore`
- `consistencyScore`
- `hitDependencyScore`
- `competitionScore`
- `growthScore`
- `opportunityScore`

## 今回の改修でできること

- 検索直後にチャンネル一覧を即表示
- 一覧表示後に動画分析を順次補完
- 営業モードとライバル調査モードの切り替え
- 一覧と詳細の両方で想定月収 low / base / high を表示
- 直近動画の再生傾向、投稿頻度、Shorts率の比較
- AI分析コメントの生成
- 既存の営業文面生成、タグ、メモ、連絡先整理

## 今できないこと

- 認証
- 決済 / Stripe
- 自動DM送信
- 自動メール送信
- JavaScript描画前提の高度な外部サイト解析
- 実収益の取得

## 将来追加予定

- query expansion の本実装
- ジョブキューによる完全非同期 enrichment
- カテゴリ別 RPM 補正
- 認証とユーザーごとのデータ分離
- Stripe による FREE / PRO 管理

## SaaS化する場合の次のステップ

1. 認証を追加してユーザー単位にデータ分離
2. PostgreSQL へ移行
3. Stripe で課金管理
4. light / deep enrichment をジョブ化
5. query expansion を業種ごとに強化

## ディレクトリ構成

```text
prisma/
  schema.prisma
  seed.ts
src/
  app/
    api/
      channels/
      drafts/
      export/
      search/
      settings/
    channels/
    search/
    settings/
    layout.tsx
    page.tsx
  components/
    channels/
    layout/
    search/
    settings/
    ui/
  lib/
    ai.ts
    channel-types.ts
    channels.ts
    constants.ts
    contact-utils.ts
    csv.ts
    mock-data.ts
    plan.ts
    prisma.ts
    rival-analysis.ts
    schemas.ts
    scoring.ts
    settings.ts
    site-scan.ts
    utils.ts
    youtube.ts
```
