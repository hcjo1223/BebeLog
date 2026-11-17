"use client";

import React, { useMemo, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Ruler, Trophy } from "lucide-react";
import type { ActivityRecord, DiaryItem, GrowthItem } from "@/lib/mock-data";
import { buildMonthGrid, formatDurationKo, formatKoreanDate, parseDateKey, toDateKey } from "@/lib/format";
import { computeDailySummary } from "@/lib/summary";

interface CalendarTabProps {
  babyName: string;
  activities: ActivityRecord[];
  diaries: DiaryItem[];
  growthRecords: GrowthItem[];
  todayKey: string;
  nowMs: number;
  onOpenDay: (dayKey: string) => void;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;
const pad = (n: number) => String(n).padStart(2, "0");

export function CalendarTab({
  babyName,
  activities,
  diaries,
  growthRecords,
  todayKey,
  nowMs,
  onOpenDay,
}: CalendarTabProps) {
  const today = parseDateKey(todayKey);
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedKey, setSelectedKey] = useState(todayKey);

  const cells = useMemo(() => buildMonthGrid(view.year, view.month), [view]);

  // 날짜별 표시 정보: 기록 수, 일기, 이정표, 성장 측정
  const marks = useMemo(() => {
    const map = new Map<string, { count: number; diary: boolean; milestone: boolean; growth: boolean }>();
    const get = (key: string) => {
      let entry = map.get(key);
      if (!entry) {
        entry = { count: 0, diary: false, milestone: false, growth: false };
        map.set(key, entry);
      }
      return entry;
    };
    activities.forEach((a) => (get(toDateKey(a.startedAt)).count += 1));
    diaries.forEach((d) => {
      const entry = get(d.diaryDate);
      entry.diary = true;
      if (d.isMilestone) entry.milestone = true;
    });
    growthRecords.forEach((g) => (get(g.date).growth = true));
    return map;
  }, [activities, diaries, growthRecords]);

  const shiftMonth = (delta: number) =>
    setView((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const isCurrentMonth = view.year === today.getFullYear() && view.month === today.getMonth();
  const keyOf = (day: number) => `${view.year}-${pad(view.month + 1)}-${pad(day)}`;

  const selectedSummary = useMemo(
    () => computeDailySummary(activities, selectedKey, nowMs),
    [activities, selectedKey, nowMs]
  );
  const selectedMark = marks.get(selectedKey);
  const selectedDiaries = diaries.filter((d) => d.diaryDate === selectedKey);
  const selectedGrowth = growthRecords.filter((g) => g.date === selectedKey);

  return (
    <div className="space-y-4 pb-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="이전 달"
          className="icon-btn text-slate-700 hover:bg-slate-100 active:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-700"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-extrabold tracking-tight" aria-live="polite">
            {view.year}년 {view.month + 1}월
          </h2>
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={() => {
                setView({ year: today.getFullYear(), month: today.getMonth() });
                setSelectedKey(todayKey);
              }}
              className="min-h-11 rounded-full px-3 text-sm font-bold text-sprout-700 underline underline-offset-2 dark:text-sprout-300"
            >
              이번 달
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          disabled={isCurrentMonth}
          aria-label="다음 달"
          className="icon-btn text-slate-700 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-30 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-700"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
        <div aria-hidden="true" className="grid grid-cols-7 bg-slate-100 py-2 text-center text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {WEEKDAYS.map((w, i) => (
            <span key={w} className={i === 0 ? "text-rose-700 dark:text-rose-300" : i === 6 ? "text-blue-700 dark:text-blue-300" : ""}>
              {w}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700">
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} className="min-h-[60px] bg-slate-50 dark:bg-night-900/60" />;
            }
            const key = keyOf(day);
            const mark = marks.get(key);
            const isToday = key === todayKey;
            const isSelected = key === selectedKey;
            const isFuture = key > todayKey;
            const labelParts = [
              `${view.month + 1}월 ${day}일`,
              isToday ? "오늘" : null,
              mark?.count ? `기록 ${mark.count}건` : null,
              mark?.milestone ? "발달 이정표" : mark?.diary ? "일기" : null,
              mark?.growth ? "신체 측정" : null,
            ].filter(Boolean);
            return (
              <button
                key={key}
                type="button"
                disabled={isFuture}
                onClick={() => setSelectedKey(key)}
                aria-label={labelParts.join(", ")}
                aria-pressed={isSelected}
                className={`relative flex min-h-[60px] flex-col items-center gap-1 pt-1.5 transition-colors duration-150 disabled:opacity-40 ${
                  isSelected
                    ? "bg-sprout-100 dark:bg-sprout-900/60"
                    : "bg-white active:bg-slate-100 dark:bg-night-900 dark:active:bg-slate-800"
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold tabular-nums ${
                    isToday ? "bg-sprout-600 text-white" : ""
                  }`}
                >
                  {day}
                </span>
                <span aria-hidden="true" className="flex h-4 items-center gap-0.5">
                  {mark?.count ? <i className="h-1.5 w-1.5 rounded-full bg-sprout-500" /> : null}
                  {mark?.milestone ? (
                    <Trophy className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  ) : mark?.diary ? (
                    <BookOpen className="h-3.5 w-3.5 text-sky-700 dark:text-sky-300" />
                  ) : null}
                  {mark?.growth ? <Ruler className="h-3.5 w-3.5 text-purple-700 dark:text-purple-300" /> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <ul aria-hidden="true" className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        <li className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-sprout-500" />기록</li>
        <li className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5 text-sky-700 dark:text-sky-300" />일기</li>
        <li className="flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />이정표</li>
        <li className="flex items-center gap-1.5"><Ruler className="h-3.5 w-3.5 text-purple-700 dark:text-purple-300" />신체 측정</li>
      </ul>

      {/* 선택한 날짜 요약 */}
      <section className="card space-y-3 p-4" aria-live="polite">
        <h3 className="text-base font-extrabold">{formatKoreanDate(selectedKey)}</h3>
        {selectedMark?.count ? (
          <dl className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white px-2 py-2.5 dark:bg-night-900">
              <dd className="text-base font-extrabold tabular-nums">{selectedSummary.feedingCount}회</dd>
              <dt className="text-sm text-muted">수유</dt>
            </div>
            <div className="rounded-xl bg-white px-2 py-2.5 dark:bg-night-900">
              <dd className="text-base font-extrabold tabular-nums">{formatDurationKo(selectedSummary.totalSleepMin)}</dd>
              <dt className="text-sm text-muted">수면</dt>
            </div>
            <div className="rounded-xl bg-white px-2 py-2.5 dark:bg-night-900">
              <dd className="text-base font-extrabold tabular-nums">{selectedSummary.wetCount + selectedSummary.poopCount}회</dd>
              <dt className="text-sm text-muted">기저귀</dt>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted">이날 {babyName}의 활동 기록이 없습니다.</p>
        )}

        {selectedDiaries.map((d) => (
          <p key={d.id} className="flex items-center gap-2 text-sm font-semibold">
            {d.isMilestone ? (
              <Trophy className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            ) : (
              <BookOpen className="h-4 w-4 shrink-0 text-sky-700 dark:text-sky-300" aria-hidden="true" />
            )}
            <span className="truncate">{d.title}</span>
          </p>
        ))}
        {selectedGrowth.map((g) => (
          <p key={g.id} className="flex items-center gap-2 text-sm font-semibold">
            <Ruler className="h-4 w-4 shrink-0 text-purple-700 dark:text-purple-300" aria-hidden="true" />
            <span className="truncate">
              {[g.weightKg > 0 ? `${g.weightKg}kg` : null, g.heightCm > 0 ? `${g.heightCm}cm` : null, g.headCm > 0 ? `머리 ${g.headCm}cm` : null]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </p>
        ))}

        <button type="button" onClick={() => onOpenDay(selectedKey)} className="btn-secondary w-full">
          {selectedKey === todayKey ? "오늘 기록장 열기" : "이날 기록장 열기"}
        </button>
      </section>
    </div>
  );
}
