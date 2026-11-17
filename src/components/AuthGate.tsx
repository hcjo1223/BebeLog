"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { ShieldCheck, Sparkles, Database, Users, ExternalLink, AlertCircle } from "lucide-react";

interface AuthGateProps {
  googleConfigured: boolean;
  onEnterDemoMode: () => void;
}

export function AuthGate({ googleConfigured, onEnterDemoMode }: AuthGateProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[#fdfcf8] dark:bg-night-900 text-slate-800 dark:text-slate-100">
      {/* 상단 Teal 히어로 배너 */}
      <div className="bg-sprout-600 text-white px-6 pt-12 pb-10 rounded-b-[2.2rem] shadow-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20">
            <img src="/sprout-128.png" alt="베베로그" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-100">
              BebeLog · 공동 육아 트래커
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight">베베로그 시작하기</h1>
          </div>
        </div>
        <p className="text-sm text-emerald-50/95 leading-relaxed">
          Google 계정으로 간편하게 로그인하고, 우리 아기의 수유·수면·기저귀·성장 기록을 가족과 실시간으로 함께 관리하세요.
        </p>
      </div>

      {/* 본문 카드 */}
      <div className="flex-1 px-5 py-6 flex flex-col justify-between gap-6">
        <div className="space-y-4">
          {/* 핵심 기능 요약 */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-sprout-700 dark:text-sprout-300 flex items-center justify-center shrink-0">
                <Database className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-bold">개인 PostgreSQL DB 안전 저장</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                  로그인한 Google 계정을 기준으로 가족 데이터와 아기 기록이 영구 저장됩니다.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-bold">초대 코드로 엄마·아빠 실시간 공유</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                  처음 세팅 시 발급되는 6자리 가족 코드로 배우자나 조부모님도 바로 합류할 수 있습니다.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-bold">한 손 원터치 기록 & 수유방 야간 모드</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                  아기를 안고 한 손으로 빠르게 수유, 수면, 기저귀, 체온을 기록하세요.
                </p>
              </div>
            </div>
          </div>

          {/* Google OAuth 미설정 시 관리자 안내 */}
          {!googleConfigured && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-xs text-amber-900 dark:text-amber-200 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-sm">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
                <span>Google OAuth 클라이언트 키 설정이 필요합니다</span>
              </div>
              <p className="leading-relaxed">
                현재 서버 환경변수에 <code>GOOGLE_CLIENT_ID</code>와 <code>GOOGLE_CLIENT_SECRET</code>이 등록되지 않았습니다. Google Cloud Console에서 OAuth 2.0 클라이언트를 생성한 뒤 서버 환경변수에 추가해주세요.
              </p>
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-amber-800 dark:text-amber-300 underline"
              >
                Google Cloud Console 열기 <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </div>
          )}
        </div>

        {/* 하단 로그인 액션 영역 (Thumb Zone) */}
        <div className="space-y-3 pb-4">
          <button
            type="button"
            disabled={!googleConfigured || isLoading}
            onClick={handleGoogleSignIn}
            className="w-full min-h-[52px] rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-sprout-600 active:scale-[0.99] transition-all shadow-sm flex items-center justify-center gap-3 px-5 font-bold text-slate-800 dark:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* Google G 공식 SVG 로고 */}
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
            <span>{isLoading ? "Google 로그인 연결 중..." : "Google 계정으로 계속하기"}</span>
          </button>

          <button
            type="button"
            onClick={onEnterDemoMode}
            className="w-full min-h-[44px] rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 underline underline-offset-2 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          >
            로그인 없이 샘플 화면 미리보기
          </button>

          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-sprout-700 dark:text-sprout-300" aria-hidden="true" />
            <span>OCI 프라이빗 PostgreSQL 16 + NextAuth 암호화 세션</span>
          </div>
        </div>
      </div>
    </div>
  );
}
