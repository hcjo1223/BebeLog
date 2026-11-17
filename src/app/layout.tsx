import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "베베로그 (BebeLog) - 공동 육아 기록 & 감성 육아일기",
  description:
    "Baby Buddy와 Memos 오픈소스 아키텍처 기반 모바일 웹(PWA) 육아 트래커 및 성장 일기",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "베베로그",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // 확대(핀치 줌)는 접근성을 위해 막지 않는다. 노치 영역까지 화면을 사용한다.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0b7d67" },
    { media: "(prefers-color-scheme: dark)", color: "#085446" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="min-h-dvh flex justify-center bg-slate-100 dark:bg-slate-950">
        {/* 모바일 퍼스트 컨테이너 (최대 폭 480px 중앙 정렬, 모바일 기기에서는 100% 꽉 찬 화면) */}
        <div className="w-full max-w-[480px] min-h-dvh bg-white dark:bg-night-900 shadow-xl flex flex-col relative overflow-x-hidden border-x border-slate-200/70 dark:border-slate-800">
          {children}
        </div>
      </body>
    </html>
  );
}
