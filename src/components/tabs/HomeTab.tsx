"use client";

import React, { useState } from "react";
import {
  Activity,
  Baby,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CloudOff,
  Droplets,
  Milk,
  Moon,
  Pill,
  Play,
  Plus,
  Sun,
  Thermometer,
  Trash2,
} from "lucide-react";
import type { ActivityCategory, ActivityRecord, RunningTimer } from "@/lib/mock-data";
import type { DailySummary, DaySlot } from "@/lib/summary";
import { formatDurationKo, formatKoreanDate, formatKoreanTime, type TimePeriod } from "@/lib/format";
import { isLocalId } from "@/lib/activity-builders";
import { CATEGORY_META } from "@/components/category-meta";

interface HomeTabProps {
  babyName: string;
  dayKey: string;
  todayKey: string;
  onShiftDay: (delta: number) => void;
  onGoToday: () => void;
  summary: DailySummary;
  daySlots: DaySlot[];
  groups: [TimePeriod, ActivityRecord[]][];
  hasRunningTimer: boolean;
  // 서버 저장 대기 상태를 표시할지 (로그인 모드에서만)
  showPending: boolean;
  onStartTimer: (category: RunningTimer["category"], label: string) => void;
  onAdd: (category: ActivityCategory | null) => void;
  onDelete: (id: string) => void;
}

const TIMER_BUTTONS: { category: RunningTimer["category"]; label: string; short: string }[] = [
  { category: "FEEDING_LEFT", label: "모유 수유 (왼쪽)", short: "모유 왼쪽" },
  { category: "FEEDING_RIGHT", label: "모유 수유 (오른쪽)", short: "모유 오른쪽" },
  { category: "SLEEP", label: "수면", short: "수면" },
  { category: "PUMPING", label: "유축", short: "유축" },
];

const SLOT_STYLE: Record<Exclude<DaySlot, null>, string> = {
  sleep: "bg-indigo-400",
  feeding: "bg-sky-500",
  diaper: "bg-sprout-500",
};

export function HomeTab({
  babyName,
  dayKey,
  todayKey,
  onShiftDay,
  onGoToday,
  summary,
  daySlots,
  groups,
  hasRunningTimer,
  showPending,
  onStartTimer,
  onAdd,
  onDelete,
}: HomeTabProps) {
  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const isToday = dayKey === todayKey;

  const stats: { key: string; Icon: typeof Sun; tone: string; value: string; label: string }[] = [
    {
      key: "feeding",
      Icon: Milk,
      tone: "text-sky-700 dark:text-sky-300",
      value: `${summary.feedingCount}회`,
      label:
        [
          summary.formulaMl > 0 ? `분유 ${summary.formulaMl}ml` : null,
          summary.breastCount > 0 ? `모유 ${summary.breastLeftMin + summary.breastRightMin}분` : null,
          summary.solidCount > 0 ? `이유식 ${summary.solidCount}회` : null,
        ]
          .filter(Boolean)
          .join(" · ") || "수유",
    },
    {
      key: "sleep",
      Icon: Moon,
      tone: "text-indigo-700 dark:text-indigo-300",
      value: formatDurationKo(summary.totalSleepMin),
      label: "수면",
    },
    {
      key: "wet",
      Icon: Droplets,
      tone: "text-sprout-700 dark:text-sprout-300",
      value: `${summary.wetCount}회`,
      label: "소변 기저귀",
    },
    {
      key: "poop",
      Icon: Baby,
      tone: "text-amber-800 dark:text-amber-300",
      value: `${summary.poopCount}회`,
      label: "대변 기저귀",
    },
    {
      key: "awake",
      Icon: Sun,
      tone: "text-amber-700 dark:text-amber-300",
      value: formatDurationKo(summary.awakeMin),
      label: "깨어 있던 시간",
    },
  ];
  if (summary.pumpMl > 0) {
    stats.push({ key: "pump", Icon: Droplets, tone: "text-purple-700 dark:text-purple-300", value: `${summary.pumpMl}ml`, label: "유축" });
  }
  if (summary.tummyCount > 0) {
    stats.push({ key: "tummy", Icon: Activity, tone: "text-amber-700 dark:text-amber-300", value: `${summary.tummyMin}분`, label: `터미타임 ${summary.tummyCount}회` });
  }
  if (summary.medCount > 0) {
    stats.push({ key: "med", Icon: Pill, tone: "text-fuchsia-700 dark:text-fuchsia-300", value: `${summary.medCount}회`, label: "투약" });
  }
  if (summary.lastTemperature !== undefined) {
    stats.push({
      key: "temp",
      Icon: Thermometer,
      tone: summary.lastTemperature >= 37.5 ? "text-rose-700 dark:text-rose-300" : "text-slate-700 dark:text-slate-300",
      value: `${summary.lastTemperature.toFixed(1)}°C`,
      label: "마지막 체온",
    });
  }

  const hasAnyRecord = groups.length > 0;

  return (
    <>
      {/* 날짜 이동 */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onShiftDay(-1)}
          aria-label="이전 날짜"
          className="icon-btn text-slate-700 hover:bg-slate-100 active:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-700"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-base font-extrabold tracking-tight" aria-live="polite">
            {/* 올해 날짜는 연도를 생략해 좁은 화면에서도 잘리지 않게 한다 */}
            {dayKey.slice(0, 4) === todayKey.slice(0, 4)
              ? formatKoreanDate(dayKey).replace(/^\d+년 /, "")
              : formatKoreanDate(dayKey)}
          </h2>
          {isToday ? (
            <span className="shrink-0 rounded-full bg-sprout-100 px-2 py-0.5 text-xs font-bold text-sprout-800 dark:bg-sprout-900 dark:text-sprout-200">
              오늘
            </span>
          ) : (
            <button
              type="button"
              onClick={onGoToday}
              className="min-h-11 shrink-0 rounded-full px-3 text-sm font-bold text-sprout-700 underline underline-offset-2 dark:text-sprout-300"
            >
              오늘로
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => onShiftDay(1)}
          disabled={isToday}
          aria-label="다음 날짜"
          className="icon-btn text-slate-700 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-30 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-700"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* 실시간 타이머 시작 (진행 중일 때는 상단 배너에서 제어) */}
      {isToday && !hasRunningTimer && (
        <section aria-labelledby="timer-start-heading">
          <h3 id="timer-start-heading" className="mb-2 text-sm font-bold text-muted">
            타이머로 재기
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {TIMER_BUTTONS.map((t) => (
              <button
                key={t.category}
                type="button"
                onClick={() => onStartTimer(t.category, t.label)}
                aria-label={`${t.label} 타이머 시작`}
                className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border border-sprout-200 bg-sprout-50 px-1 text-[13px] font-bold leading-tight text-sprout-800 transition-colors duration-150 active:bg-sprout-100 dark:border-slate-700 dark:bg-slate-800 dark:text-sprout-200 dark:active:bg-slate-700"
              >
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                {t.short}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 일일 요약 */}
      <section className="card p-4" aria-labelledby="summary-heading">
        <h3 id="summary-heading">
          <button
            type="button"
            onClick={() => setSummaryExpanded((v) => !v)}
            aria-expanded={summaryExpanded}
            aria-controls="summary-panel"
            className="-my-2 flex min-h-11 w-full items-center justify-between gap-2 text-left text-base font-extrabold"
          >
            <span>{isToday ? "오늘 요약" : "이날 요약"}</span>
            <ChevronDown
              className={`h-5 w-5 text-slate-500 transition-transform duration-200 dark:text-slate-400 ${summaryExpanded ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
        </h3>

        {summaryExpanded && (
          <div id="summary-panel" className="mt-3 space-y-4">
            <dl className="grid grid-cols-2 gap-x-3 gap-y-3.5">
              {stats.map((s) => (
                <div key={s.key} className="flex min-w-0 items-start gap-2.5">
                  <s.Icon className={`mt-0.5 h-5 w-5 shrink-0 ${s.tone}`} aria-hidden="true" />
                  <div className="min-w-0">
                    <dd className="text-base font-extrabold leading-tight tabular-nums">{s.value}</dd>
                    <dt className="text-sm leading-snug text-muted">{s.label}</dt>
                  </div>
                </div>
              ))}
            </dl>

            {/* 24시간 흐름 */}
            <div>
              <div
                role="img"
                aria-label={`24시간 흐름: 수면 ${formatDurationKo(summary.totalSleepMin)}, 수유 ${summary.feedingCount}회, 기저귀 ${summary.wetCount + summary.poopCount}회`}
                className="flex h-5 w-full gap-px overflow-hidden rounded-md bg-slate-200 dark:bg-slate-700"
              >
                {daySlots.map((slot, i) => (
                  <span key={i} className={`h-full flex-1 ${slot ? SLOT_STYLE[slot] : ""}`} />
                ))}
              </div>
              <div aria-hidden="true" className="mt-1 flex justify-between text-xs tabular-nums text-muted">
                <span>0시</span>
                <span>6시</span>
                <span>12시</span>
                <span>18시</span>
                <span>24시</span>
              </div>
              <ul aria-hidden="true" className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                <li className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-indigo-400" />수면</li>
                <li className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-sky-500" />수유</li>
                <li className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-sprout-500" />기저귀</li>
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* 타임라인 */}
      <section aria-labelledby="timeline-heading" className="space-y-4 pb-2">
        <h3 id="timeline-heading" className="sr-only">
          타임라인
        </h3>
        {!hasAnyRecord ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center dark:border-slate-600 dark:bg-slate-800/60">
            <img src="/sprout-128.png" alt="" className="mx-auto h-14 w-14 object-contain opacity-90" />
            <p className="mt-3 text-base font-bold">
              {isToday ? `아직 오늘 ${babyName}의 기록이 없어요` : "이날은 기록이 없어요"}
            </p>
            <p className="mt-1 text-sm text-muted">
              {isToday ? "수유, 기저귀, 수면을 탭 한 번으로 남겨 보세요." : "다른 날짜를 보거나 오늘 기록을 추가해 보세요."}
            </p>
            {isToday ? (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <button type="button" onClick={() => onAdd("FEEDING")} className="btn-primary">
                  <Plus className="h-5 w-5" aria-hidden="true" />첫 수유 기록하기
                </button>
                <button type="button" onClick={() => onAdd(null)} className="btn-secondary">
                  다른 기록 추가
                </button>
              </div>
            ) : (
              <button type="button" onClick={onGoToday} className="btn-primary mt-4">
                오늘로 이동
              </button>
            )}
          </div>
        ) : (
          groups.map(([period, items]) => (
            <div key={period}>
              <h4 className="mb-2 pl-6 text-sm font-bold text-muted">{period}</h4>
              <ul className="relative space-y-1 pl-5 before:absolute before:bottom-4 before:left-[7px] before:top-4 before:w-0.5 before:bg-slate-200 before:content-[''] dark:before:bg-slate-700">
                {items.map((item) => {
                  const meta = CATEGORY_META[item.category];
                  const start = formatKoreanTime(item.startedAt);
                  const end = item.endedAt ? formatKoreanTime(item.endedAt) : null;
                  const pending = showPending && isLocalId(item.id);
                  return (
                    <li key={item.id} className="relative flex min-h-14 items-center gap-3">
                      <span
                        aria-hidden="true"
                        className={`absolute -left-[17px] h-3 w-3 rounded-full ring-4 ring-white dark:ring-night-900 ${meta.dot}`}
                      />
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${meta.box}`}>
                        <meta.Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1 py-1">
                        <p className="flex items-center gap-1.5">
                          <span className="truncate text-[15px] font-bold">{item.summaryTitle}</span>
                          <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                            {item.recordedBy}
                          </span>
                        </p>
                        <p className="truncate text-sm text-muted">
                          <time dateTime={item.startedAt} className="tabular-nums">
                            {end ? `${start}~${end}` : start}
                          </time>
                          {item.subDetail ? ` · ${item.subDetail}` : ""}
                        </p>
                        {pending && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                            <CloudOff className="h-3.5 w-3.5" aria-hidden="true" />
                            저장 대기 중 · 연결되면 자동 전송
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => onDelete(item.id)}
                        aria-label={`${item.summaryTitle} (${start}) 삭제`}
                        className="icon-btn -mr-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 active:bg-rose-100 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                      >
                        <Trash2 className="h-[18px] w-[18px]" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </section>
    </>
  );
}
