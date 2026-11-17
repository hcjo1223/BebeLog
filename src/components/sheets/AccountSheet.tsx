"use client";

import React, { useState } from "react";
import { Check, Copy, LogOut, Moon, Sun } from "lucide-react";
import { BottomSheet, ChipGroup } from "@/components/ui/BottomSheet";

export interface AuthUserInfo {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface HouseholdInfo {
  id: string;
  name: string;
  inviteCode: string;
  myRelationLabel: string;
  myRole: string;
  members: {
    id: string;
    relationLabel: string;
    role: string;
    name: string;
    avatarUrl?: string | null;
  }[];
}

interface AccountSheetProps {
  authUser: AuthUserInfo | null;
  household: HouseholdInfo | null;
  isDemo: boolean;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  caregiver: string;
  onChangeCaregiver: (label: string) => void;
  onSignOut: () => void;
  onGoToLogin: () => void;
  onClose: () => void;
}

const DEMO_CAREGIVERS = ["엄마", "아빠", "할머니"] as const;

export function AccountSheet({
  authUser,
  household,
  isDemo,
  darkMode,
  onToggleDarkMode,
  caregiver,
  onChangeCaregiver,
  onSignOut,
  onGoToLogin,
  onClose,
}: AccountSheetProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    setTimeout(() => setCopyState("idle"), 2500);
  };

  return (
    <BottomSheet title="설정" onClose={onClose}>
      {/* 화면 설정 */}
      <button
        type="button"
        role="switch"
        aria-checked={darkMode}
        onClick={onToggleDarkMode}
        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-slate-300 px-4 text-left dark:border-slate-600"
      >
        <span className="flex items-center gap-3">
          {darkMode ? (
            <Moon className="h-5 w-5 text-indigo-300" aria-hidden="true" />
          ) : (
            <Sun className="h-5 w-5 text-amber-600" aria-hidden="true" />
          )}
          <span>
            <span className="block text-sm font-bold">다크 모드</span>
            <span className="block text-sm text-muted">새벽 수유 때 눈부심을 줄여 줍니다</span>
          </span>
        </span>
        <span
          aria-hidden="true"
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-150 ${
            darkMode ? "bg-sprout-600" : "bg-slate-300"
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-[left] duration-150 ${
              darkMode ? "left-[22px]" : "left-0.5"
            }`}
          />
        </span>
      </button>

      {!isDemo && authUser ? (
        <>
          <div className="card flex items-center gap-3 p-3.5">
            {authUser.avatarUrl ? (
              <img
                src={authUser.avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="h-11 w-11 rounded-full border border-slate-200 object-cover dark:border-slate-600"
              />
            ) : (
              <div aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-full bg-sprout-600 font-bold text-white">
                {authUser.name.slice(0, 1)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">
                {authUser.name}
                {household?.myRelationLabel ? ` (${household.myRelationLabel})` : ""}
              </p>
              <p className="truncate text-sm text-muted">{authUser.email}</p>
            </div>
          </div>

          {household && (
            <section aria-labelledby="invite-heading" className="space-y-3 rounded-2xl border border-sprout-200 bg-sprout-50 p-4 dark:border-sprout-800 dark:bg-sprout-900/30">
              <h3 id="invite-heading" className="text-sm font-bold text-sprout-900 dark:text-sprout-200">
                {household.name} 가족 초대 코드
              </h3>
              <div className="flex items-stretch gap-2">
                <code className="flex flex-1 items-center justify-center rounded-xl border border-sprout-200 bg-white px-3 font-mono text-lg font-extrabold tracking-widest text-sprout-700 dark:border-sprout-800 dark:bg-night-900 dark:text-sprout-300">
                  {household.inviteCode}
                </code>
                <button type="button" onClick={() => handleCopy(household.inviteCode)} className="btn-primary px-4">
                  {copyState === "copied" ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  )}
                  복사
                </button>
              </div>
              <p role="status" aria-live="polite" className="text-sm text-sprout-900/80 dark:text-sprout-200/90">
                {copyState === "copied"
                  ? "초대 코드를 복사했습니다."
                  : copyState === "failed"
                  ? "복사하지 못했습니다. 코드를 길게 눌러 직접 복사해 주세요."
                  : "가족이 Google 로그인 후 이 코드를 입력하면 기록을 함께 보고 작성할 수 있습니다."}
              </p>

              {household.members.length > 0 && (
                <ul className="flex flex-wrap gap-1.5" aria-label="함께하는 가족">
                  {household.members.map((m) => (
                    <li key={m.id} className="rounded-lg bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-700 dark:bg-night-900 dark:text-slate-200">
                      {m.relationLabel} · {m.name}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-rose-50 text-sm font-bold text-rose-700 transition-colors active:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:active:bg-rose-950/70"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            로그아웃
          </button>
        </>
      ) : (
        <>
          <ChipGroup
            label="샘플 화면의 기록자"
            value={(DEMO_CAREGIVERS as readonly string[]).includes(caregiver) ? caregiver : "엄마"}
            onChange={onChangeCaregiver}
            options={DEMO_CAREGIVERS.map((c) => ({ value: c as string, label: c }))}
          />
          <p className="text-sm leading-relaxed text-muted">
            지금은 샘플 데이터 미리보기 모드라 기록이 저장되지 않습니다. Google 계정으로 로그인하면 우리 아기 기록을 저장하고 가족과 공유할 수 있습니다.
          </p>
          <button type="button" onClick={onGoToLogin} className="btn-primary w-full">
            로그인 화면으로 이동
          </button>
        </>
      )}
    </BottomSheet>
  );
}
