import type { ExternalScanLogEntry, LatestVideoContact, SocialLink } from "@/lib/channel-types";

type MockVideoSeed = {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  viewCount: number;
  likeCount?: number;
  commentCount?: number;
  durationSec: number;
  isShorts?: boolean;
  thumbnailUrl?: string;
};

export type MockChannelSeed = {
  channelId: string;
  title: string;
  description: string;
  customUrl?: string;
  publishedAt: string;
  country: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  thumbnailUrl: string;
  seedQueries: string[];
  latestVideos: MockVideoSeed[];
  externalSiteScan?: {
    scannedUrl: string;
    status: string;
    errorMessage?: string | null;
    extractedEmails?: string[];
    extractedFormUrls?: string[];
    extractedSocialLinks?: SocialLink[];
    companyNameGuess?: string | null;
    addressGuess?: string | null;
    phoneGuess?: string | null;
    robotsAllowed?: boolean;
  };
};

export const MOCK_CHANNEL_SEEDS: MockChannelSeed[] = [
  {
    channelId: "UC-TL-0001-CORGI",
    title: "コーギー暮らし研究所",
    description:
      "東京でコーギー2匹と暮らす日常チャンネル。レビュー、しつけ、犬用品の比較が中心です。お問い合わせは hello@corgilab.jp まで。公式サイト https://corgilab.jp / Instagram https://instagram.com/corgilab",
    customUrl: "@corgilabjp",
    publishedAt: "2021-05-15T00:00:00.000Z",
    country: "JP",
    subscriberCount: 18200,
    videoCount: 164,
    viewCount: 3820000,
    thumbnailUrl: "https://placehold.co/96x96/e7e5e4/0f172a?text=CG",
    seedQueries: ["コーギー", "corgi", "ウェルシュコーギー"],
    latestVideos: [
      {
        videoId: "mock-corgi-001",
        title: "コーギーと泊まれる宿を本気で比較してみた",
        description:
          "案件やコラボの相談は collab@corgilab.jp まで。ショップ https://corgilab.jp/shop / Linktree https://linktr.ee/corgilab",
        publishedAt: "2026-03-07T09:00:00.000Z",
        viewCount: 128000,
        likeCount: 3600,
        commentCount: 420,
        durationSec: 788,
      },
      {
        videoId: "mock-corgi-002",
        title: "3秒で笑うコーギー Shorts",
        description: "Instagram https://instagram.com/corgilab",
        publishedAt: "2026-03-02T09:00:00.000Z",
        viewCount: 410000,
        likeCount: 9800,
        commentCount: 210,
        durationSec: 34,
        isShorts: true,
      },
      {
        videoId: "mock-corgi-003",
        title: "犬用カート5台を比較。コーギー目線で辛口レビュー",
        description: "比較表は https://corgilab.jp/media で公開しています。",
        publishedAt: "2026-02-22T09:00:00.000Z",
        viewCount: 97000,
        likeCount: 2400,
        commentCount: 180,
        durationSec: 862,
      },
      {
        videoId: "mock-corgi-004",
        title: "朝の散歩ルーティン Shorts",
        description: "犬の朝活風景をショートで。",
        publishedAt: "2026-02-19T09:00:00.000Z",
        viewCount: 260000,
        likeCount: 7200,
        commentCount: 96,
        durationSec: 41,
        isShorts: true,
      },
      {
        videoId: "mock-corgi-005",
        title: "コーギーと暮らすと毎月いくらかかる？",
        description: "視聴者さんから多かった質問に答えます。",
        publishedAt: "2026-02-11T09:00:00.000Z",
        viewCount: 83000,
        likeCount: 1900,
        commentCount: 130,
        durationSec: 694,
      },
    ],
    externalSiteScan: {
      scannedUrl: "https://corgilab.jp",
      status: "success",
      extractedEmails: ["hello@corgilab.jp", "collab@corgilab.jp"],
      extractedFormUrls: ["https://corgilab.jp/contact"],
      extractedSocialLinks: [
        { platform: "instagram", url: "https://instagram.com/corgilab", sourceType: "external_site" },
      ],
      companyNameGuess: "Corgi Lab",
      addressGuess: "東京都渋谷区神宮前1-2-3",
      phoneGuess: "03-1234-5678",
      robotsAllowed: true,
    },
  },
  {
    channelId: "UC-TL-0002-PROP",
    title: "Prop Trading Journal JP",
    description:
      "プロップファームや funded trader の制度を日本語で解説するチャンネル。問い合わせは https://propjournal.jp/contact から。",
    customUrl: "@propjournaljp",
    publishedAt: "2020-09-10T00:00:00.000Z",
    country: "JP",
    subscriberCount: 9600,
    videoCount: 121,
    viewCount: 1540000,
    thumbnailUrl: "https://placehold.co/96x96/d6d3d1/0f172a?text=PF",
    seedQueries: ["プロップファーム", "prop firm", "funded trader"],
    latestVideos: [
      {
        videoId: "mock-prop-001",
        title: "2026年版 FTMO 比較。どこが本当に通りやすい？",
        description: "詳細記事 https://propjournal.jp/media / 問い合わせ https://propjournal.jp/contact",
        publishedAt: "2026-03-08T09:00:00.000Z",
        viewCount: 52000,
        likeCount: 1300,
        commentCount: 140,
        durationSec: 920,
      },
      {
        videoId: "mock-prop-002",
        title: "prop trading 失格パターンを1分で確認 Shorts",
        description: "X https://x.com/propjournaljp",
        publishedAt: "2026-02-27T09:00:00.000Z",
        viewCount: 71000,
        likeCount: 1800,
        commentCount: 52,
        durationSec: 49,
        isShorts: true,
      },
      {
        videoId: "mock-prop-003",
        title: "funded trader に向く人の共通点",
        description: "本編はロング動画です。",
        publishedAt: "2026-02-18T09:00:00.000Z",
        viewCount: 34000,
        likeCount: 840,
        commentCount: 63,
        durationSec: 682,
      },
      {
        videoId: "mock-prop-004",
        title: "口座サイズ別に見る prop firm の期待値",
        description: "検証シートはサイトで配布中。",
        publishedAt: "2026-02-02T09:00:00.000Z",
        viewCount: 28000,
        likeCount: 690,
        commentCount: 41,
        durationSec: 744,
      },
    ],
    externalSiteScan: {
      scannedUrl: "https://propjournal.jp",
      status: "success",
      extractedFormUrls: ["https://propjournal.jp/contact"],
      extractedSocialLinks: [{ platform: "x", url: "https://x.com/propjournaljp", sourceType: "external_site" }],
      companyNameGuess: "Prop Journal",
      addressGuess: "東京都中野区本町3-10-4",
      phoneGuess: null,
      robotsAllowed: true,
    },
  },
  {
    channelId: "UC-TL-0003-DENTAL",
    title: "銀座デンタル経営ラボ",
    description:
      "歯科医院向けに集客や採用の考え方を発信。取材依頼は dental@ginza-clinic.jp。公式サイト https://ginza-dental-lab.jp",
    customUrl: "@ginzadentalbiz",
    publishedAt: "2018-07-03T00:00:00.000Z",
    country: "JP",
    subscriberCount: 7600,
    videoCount: 214,
    viewCount: 1980000,
    thumbnailUrl: "https://placehold.co/96x96/f1f5f9/0f172a?text=DT",
    seedQueries: ["歯医者", "歯科", "dental clinic"],
    latestVideos: [
      {
        videoId: "mock-dental-001",
        title: "歯科医院の採用で今うまくいく動画導線とは",
        description: "フォーム https://ginza-dental-lab.jp/contact",
        publishedAt: "2026-03-05T09:00:00.000Z",
        viewCount: 22000,
        likeCount: 520,
        commentCount: 18,
        durationSec: 860,
      },
      {
        videoId: "mock-dental-002",
        title: "院長向け 30秒でわかる広告費の見直し Shorts",
        description: "X https://x.com/ginzadentallab",
        publishedAt: "2026-02-26T09:00:00.000Z",
        viewCount: 19000,
        likeCount: 410,
        commentCount: 12,
        durationSec: 31,
        isShorts: true,
      },
      {
        videoId: "mock-dental-003",
        title: "自由診療を伸ばす説明トークの作り方",
        description: "現場向けのロング動画。",
        publishedAt: "2026-02-14T09:00:00.000Z",
        viewCount: 17000,
        likeCount: 350,
        commentCount: 22,
        durationSec: 742,
      },
    ],
    externalSiteScan: {
      scannedUrl: "https://ginza-dental-lab.jp",
      status: "success",
      extractedEmails: ["dental@ginza-clinic.jp"],
      extractedFormUrls: ["https://ginza-dental-lab.jp/contact"],
      extractedSocialLinks: [{ platform: "x", url: "https://x.com/ginzadentallab", sourceType: "external_site" }],
      companyNameGuess: "銀座デンタルラボ",
      addressGuess: "東京都中央区銀座5-8-1",
      phoneGuess: "03-1111-2222",
      robotsAllowed: true,
    },
  },
  {
    channelId: "UC-TL-0004-HAIR",
    title: "表参道ヘアサロン経営室",
    description:
      "美容室経営とSNS運用の実務を発信。サロンページ https://hair-omotesando.jp/service からお問い合わせできます。",
    customUrl: "@omotesandohairmanagement",
    publishedAt: "2021-11-01T00:00:00.000Z",
    country: "JP",
    subscriberCount: 5400,
    videoCount: 87,
    viewCount: 1260000,
    thumbnailUrl: "https://placehold.co/96x96/e5e7eb/0f172a?text=HM",
    seedQueries: ["美容室", "ヘアサロン", "美容院"],
    latestVideos: [
      {
        videoId: "mock-hair-001",
        title: "美容室のInstagram導線を3週間で改善した話",
        description: "フォーム https://hair-omotesando.jp/contact / Instagram https://instagram.com/hair.omotesando",
        publishedAt: "2026-03-09T09:00:00.000Z",
        viewCount: 84000,
        likeCount: 2300,
        commentCount: 160,
        durationSec: 618,
      },
      {
        videoId: "mock-hair-002",
        title: "ヘアサロンのビフォーアフター Shorts",
        description: "TikTok https://www.tiktok.com/@hair.omotesando",
        publishedAt: "2026-03-03T09:00:00.000Z",
        viewCount: 210000,
        likeCount: 6100,
        commentCount: 120,
        durationSec: 37,
        isShorts: true,
      },
      {
        videoId: "mock-hair-003",
        title: "美容室の単価アップに効いたカウンセリング導線",
        description: "長尺の解説動画です。",
        publishedAt: "2026-02-21T09:00:00.000Z",
        viewCount: 69000,
        likeCount: 1600,
        commentCount: 102,
        durationSec: 730,
      },
      {
        videoId: "mock-hair-004",
        title: "採用が強い美容室の求人票の作り方",
        description: "現場で使えるテンプレを紹介。",
        publishedAt: "2026-02-10T09:00:00.000Z",
        viewCount: 58000,
        likeCount: 1300,
        commentCount: 74,
        durationSec: 810,
      },
      {
        videoId: "mock-hair-005",
        title: "3秒でわかる髪質改善 Shorts",
        description: "Shortsで流入を作る実験中。",
        publishedAt: "2026-02-05T09:00:00.000Z",
        viewCount: 185000,
        likeCount: 5000,
        commentCount: 95,
        durationSec: 28,
        isShorts: true,
      },
    ],
    externalSiteScan: {
      scannedUrl: "https://hair-omotesando.jp",
      status: "success",
      extractedFormUrls: ["https://hair-omotesando.jp/contact"],
      extractedSocialLinks: [
        { platform: "instagram", url: "https://instagram.com/hair.omotesando", sourceType: "external_site" },
        { platform: "tiktok", url: "https://www.tiktok.com/@hair.omotesando", sourceType: "external_site" },
      ],
      companyNameGuess: "Omotesando Hair Management",
      addressGuess: "東京都渋谷区神宮前3-5-7",
      phoneGuess: "03-3333-4444",
      robotsAllowed: true,
    },
  },
  {
    channelId: "UC-TL-0005-FX",
    title: "EA研究ノート",
    description:
      "FXの自動売買EAを検証するチャンネル。検証ログは https://ea-note.jp / お問い合わせ hello@ea-note.jp",
    customUrl: "@eanotejp",
    publishedAt: "2022-02-18T00:00:00.000Z",
    country: "JP",
    subscriberCount: 12300,
    videoCount: 146,
    viewCount: 2750000,
    thumbnailUrl: "https://placehold.co/96x96/dbeafe/0f172a?text=FX",
    seedQueries: ["FX 自動売買", "EA 作り方", "FX"],
    latestVideos: [
      {
        videoId: "mock-fx-001",
        title: "EAを量産しても勝てない人が見落とす3つのポイント",
        description: "配布サイト https://ea-note.jp / mail: hello@ea-note.jp",
        publishedAt: "2026-03-10T09:00:00.000Z",
        viewCount: 156000,
        likeCount: 4200,
        commentCount: 280,
        durationSec: 980,
      },
      {
        videoId: "mock-fx-002",
        title: "今週の相場を30秒で確認 Shorts",
        description: "X https://x.com/eanotejp",
        publishedAt: "2026-03-06T09:00:00.000Z",
        viewCount: 138000,
        likeCount: 3700,
        commentCount: 110,
        durationSec: 32,
        isShorts: true,
      },
      {
        videoId: "mock-fx-003",
        title: "EAのバックテスト精度を上げる設定大全",
        description: "ロング動画で詳しく解説。",
        publishedAt: "2026-02-25T09:00:00.000Z",
        viewCount: 121000,
        likeCount: 3300,
        commentCount: 190,
        durationSec: 1120,
      },
      {
        videoId: "mock-fx-004",
        title: "プロップ向けEAの考え方",
        description: "無料配布はサイトから。",
        publishedAt: "2026-02-16T09:00:00.000Z",
        viewCount: 86000,
        likeCount: 2100,
        commentCount: 140,
        durationSec: 730,
      },
    ],
    externalSiteScan: {
      scannedUrl: "https://ea-note.jp",
      status: "success",
      extractedEmails: ["hello@ea-note.jp"],
      extractedFormUrls: ["https://ea-note.jp/contact"],
      extractedSocialLinks: [{ platform: "x", url: "https://x.com/eanotejp", sourceType: "external_site" }],
      companyNameGuess: "EA Note",
      addressGuess: "東京都港区南青山2-4-8",
      phoneGuess: null,
      robotsAllowed: true,
    },
  },
];

export function buildMockVideoRecords(seed: MockChannelSeed): LatestVideoContact[] {
  return seed.latestVideos.map((video) => ({
    videoId: video.videoId,
    title: video.title,
    description: video.description,
    publishedAt: video.publishedAt,
    videoUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
    viewCount: video.viewCount,
    likeCount: video.likeCount ?? null,
    commentCount: video.commentCount ?? null,
    durationSec: video.durationSec,
    isShorts: video.isShorts ?? video.durationSec <= 70,
    thumbnailUrl: video.thumbnailUrl || `https://placehold.co/480x270/e2e8f0/0f172a?text=${video.videoId.slice(-3)}`,
    extractedEmails: [],
    extractedUrls: [],
    socialLinks: [],
    officialWebsiteUrls: [],
    contactEvidence: [],
  }));
}

export function buildMockExternalLog(seed: MockChannelSeed): ExternalScanLogEntry[] {
  if (!seed.externalSiteScan) {
    return [];
  }

  return [
    {
      scannedUrl: seed.externalSiteScan.scannedUrl,
      status: seed.externalSiteScan.status,
      errorMessage: seed.externalSiteScan.errorMessage || null,
      extractedEmails: seed.externalSiteScan.extractedEmails || [],
      extractedFormUrls: seed.externalSiteScan.extractedFormUrls || [],
      extractedSocialLinks: seed.externalSiteScan.extractedSocialLinks || [],
      companyNameGuess: seed.externalSiteScan.companyNameGuess || null,
      addressGuess: seed.externalSiteScan.addressGuess || null,
      phoneGuess: seed.externalSiteScan.phoneGuess || null,
      robotsAllowed: seed.externalSiteScan.robotsAllowed ?? true,
    },
  ];
}
