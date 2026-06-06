import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "./components/Header";
import { BottomNav } from "./components/BottomNav";
import { TripGate } from "./components/TripGate";
import { ThemeApplier } from "./components/ThemeApplier";

export const metadata: Metadata = {
  title: "PP添乗員 — 旅の作戦ガイド",
  description:
    "旅程・会話フレーズ・決済戦略・緊急対応をスマホ1つに集約する旅行ガイド。AIが次の行動を案内し、予定変更も組み直します。",
  robots: { index: false, follow: false }, // URLを知っている人だけが閲覧する想定
  appleWebApp: { capable: true, statusBarStyle: "default", title: "PP添乗員" },
};

export const viewport: Viewport = {
  themeColor: "#0047a0",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" data-trip="seoul-2026">
      <body>
        <ThemeApplier />
        {/* Google Fonts（React 19 が <link> を head へ巻き上げる） */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800&family=Noto+Sans+KR:wght@400;700;900&family=Noto+Sans+JP:wght@400;500;700;900&display=swap"
        />
        <Header />
        <main className="mx-auto w-full max-w-[680px]">
          <TripGate>{children}</TripGate>
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
