import type { Metadata } from "next";
import { Fraunces, Noto_Sans_JP } from "next/font/google";

import "./globals.css";

const bodyFont = Noto_Sans_JP({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const headingFont = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "TubeLead",
  description: "YouTubeチャンネル検索から営業リスト化、AI下書き生成まで対応するローカルSaaS MVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${bodyFont.variable} ${headingFont.variable} antialiased`}>{children}</body>
    </html>
  );
}
