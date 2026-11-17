"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Pause, Play, Settings, Square, UserPlus } from "lucide-react";
import type { ActivityCategory, BabyProfile, RunningTimer } from "@/lib/mock-data";
import { calculateAgeInfo, formatBubbleDuration, formatTimerSec } from "@/lib/format";
import { CATEGORY_META, CATEGORY_ORDER } from "@/components/category-meta";

interface AppHeaderProps {
  householdName: string;
  caregiver: string;
  tabTitle: string;
  babies: BabyProfile[];
  currentBaby: BabyProfile;
  nowMs: number;
  onSelectBaby: (id: string) => void;
  onAddBaby: () => void;
  onOpenSettings: () => void;
  runningTimer: RunningTimer | null;
  timerSeconds: number;
  onTogglePause: () => void;
  onStopTimer: () => void;
  showTiles: boolean;
  // 카테고리별 마지막 기록 시각(ISO). 수면은 깬 시각 기준
  latestAt: Partial<Record<ActivityCategory, string | undefined>>;
  onTile: (category: ActivityCategory) => void;
}

// 타일 위 버블로 "마지막 기록 후 경과 시간"을 보여 줄 카테고리
const BUBBLE_CATEGORIES: ActivityCategory[] = ["FEEDING", "DIAPER", "SLEEP"];

export function AppHeader({
  householdName,
  caregiver,
  tabTitle,
  babies,
  currentBaby,
  nowMs,
  onSelectBaby,
  onAddBaby,
  onOpenSettings,
  runningTimer,
  timerSeconds,
  onTogglePause,
  onStopTimer,
  showTiles,
  latestAt,
  onTile,
}: AppHeaderProps) {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);
  const ageInfo = calculateAgeInfo(currentBaby.birthDate, currentBaby.dueDate, nowMs);

  // 바깥 탭 또는 Esc로 아이 선택 메뉴 닫기
  useEffect(() => {
    if (!selectorOpen) return;
    const handlePointer = (e: PointerEvent) => {
      if (!selectorRef.current?.contains(e.target as Node)) setSelectorOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectorOpen(false);
    };
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [selectorOpen]);

  return (
    <header className="relative z-30 bg-gradient-to-b from-sprout-600 to-sprout-700 px-4 pb-3 pt-[max(0.875rem,env(safe-area-inset-top))] text-white shadow-md dark:from-sprout-800 dark:to-sprout-900">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-white/40 bg-[#fdf6e9] p-1.5 shadow-md">
            <img src="/sprout-128.png" alt="" className="h-8 w-8 object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white/90">
              {householdName} · {caregiver}님
            </p>
            <h1 className="truncate text-lg font-extrabold leading-tight tracking-tight">{tabTitle}</h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {/* 아이 전환 */}
          <div ref={selectorRef} className="relative">
            <button
              type="button"
              onClick={() => setSelectorOpen((v) => !v)}
              aria-haspopup="true"
              aria-expanded={selectorOpen}
              aria-label={`${currentBaby.name}, 생후 ${ageInfo.diffDays}일. 아이 전환`}
              className="flex min-h-11 items-center gap-1.5 rounded-full border border-white/30 bg-white/15 pl-3.5 pr-2 text-left transition-colors duration-150 active:bg-white/30"
            >
              <span className="leading-tight">
                <span className="block max-w-[92px] truncate text-sm font-extrabold">{currentBaby.name}</span>
                <span className="block whitespace-nowrap text-xs font-medium text-white/90">
                  D+{ageInfo.diffDays} · {ageInfo.weeks}주
                </span>
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform duration-200 ${selectorOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>

            {selectorOpen && (
              <div className="absolute right-0 z-50 mt-2 w-64 animate-fade-in rounded-2xl border border-slate-200 bg-white p-1.5 text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-night-800 dark:text-slate-100">
                <ul>
                  {babies.map((b) => {
                    const selected = b.id === currentBaby.id;
                    const info = calculateAgeInfo(b.birthDate, b.dueDate, nowMs);
                    return (
                      <li key={b.id}>
                        <button
                          type="button"
                          aria-current={selected ? "true" : undefined}
                          onClick={() => {
                            setSelectorOpen(false);
                            if (!selected) onSelectBaby(b.id);
                          }}
                          className={`flex min-h-14 w-full items-center justify-between gap-2 rounded-xl px-3 text-left transition-colors duration-150 ${
                            selected
                              ? "bg-sprout-50 font-bold text-sprout-800 dark:bg-sprout-900/50 dark:text-sprout-200"
                              : "active:bg-slate-100 dark:active:bg-slate-700"
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-[15px] font-bold">{b.name}</span>
                            <span className="block text-sm text-muted">
                              생후 {info.diffDays}일 · {info.weeks}주
                            </span>
                          </span>
                          {selected && <Check className="h-5 w-5 shrink-0" aria-hidden="true" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  onClick={() => {
                    setSelectorOpen(false);
                    onAddBaby();
                  }}
                  className="mt-1 flex min-h-12 w-full items-center gap-2 rounded-xl border-t border-slate-200 px-3 text-[15px] font-bold text-sprout-700 active:bg-slate-100 dark:border-slate-700 dark:text-sprout-300 dark:active:bg-slate-700"
                >
                  <UserPlus className="h-5 w-5" aria-hidden="true" />
                  아기 추가
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="설정"
            className="icon-btn bg-white/15 text-white active:bg-white/30"
          >
            <Settings className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* 진행 중인 타이머 (가족 기기 간 공유) */}
      {runningTimer && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/25 bg-slate-900/35 p-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <span
                aria-hidden="true"
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${runningTimer.isPaused ? "bg-amber-300" : "animate-pulse bg-emerald-300"}`}
              />
              <span className="truncate">
                {runningTimer.label} · {runningTimer.startedBy}
                {runningTimer.isPaused ? " · 일시정지" : ""}
              </span>
            </p>
            <p role="timer" aria-label={`${runningTimer.label} 경과 시간`} className="mt-0.5 font-mono text-3xl font-extrabold tabular-nums tracking-wide">
              {formatTimerSec(timerSeconds)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onTogglePause}
              aria-label={runningTimer.isPaused ? "타이머 재개" : "타이머 일시정지"}
              className="icon-btn h-12 w-12 bg-white/20 active:bg-white/35"
            >
              {runningTimer.isPaused ? (
                <Play className="h-5 w-5 fill-white" aria-hidden="true" />
              ) : (
                <Pause className="h-5 w-5 fill-white" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={onStopTimer}
              className="inline-flex min-h-12 items-center gap-1.5 rounded-2xl bg-white px-3.5 text-sm font-extrabold text-sprout-700 shadow-sm active:bg-sprout-50"
            >
              <Square className="h-4 w-4 fill-current" aria-hidden="true" />
              종료·저장
            </button>
          </div>
        </div>
      )}

      {/* 빠른 기록 타일 (가로 스크롤) */}
      {showTiles && (
        <nav aria-label="빠른 기록" className="no-scrollbar -mx-4 mt-3 overflow-x-auto px-4 pt-3">
          <ul className="flex min-w-max items-end gap-3 pb-1">
            {CATEGORY_ORDER.map((category) => {
              const meta = CATEGORY_META[category];
              const elapsed = BUBBLE_CATEGORIES.includes(category)
                ? formatBubbleDuration(latestAt[category], nowMs)
                : null;
              const bubble = elapsed === "0:00" ? "방금" : elapsed;
              return (
                <li key={category}>
                  <button
                    type="button"
                    onClick={() => onTile(category)}
                    aria-label={
                      !elapsed
                        ? `${meta.label} 기록하기`
                        : elapsed === "0:00"
                        ? `${meta.label} 기록하기, 방금 기록함`
                        : `${meta.label} 기록하기, 마지막 기록 후 ${elapsed.replace(":", "시간 ")}분`
                    }
                    className="group relative flex w-[68px] flex-col items-center rounded-2xl pt-3"
                  >
                    {bubble && (
                      <span
                        aria-hidden="true"
                        className="absolute top-0 z-10 whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-xs font-extrabold tabular-nums text-slate-800 shadow-sm"
                      >
                        {bubble}
                      </span>
                    )}
                    <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-[3px] border-white/90 bg-[#f4f1ea] shadow-md transition-opacity duration-150 group-active:opacity-75 dark:border-slate-600 dark:bg-slate-800">
                      <img src={meta.tileSrc} alt="" width={56} height={56} className="h-14 w-14 object-cover" />
                    </span>
                    <span aria-hidden="true" className="mt-1.5 text-sm font-bold">
                      {meta.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}
