"use client";

import React from "react";
import { Baby, Droplets, Milk, Moon, Smartphone } from "lucide-react";
import type { ActivityRecord, RunningTimer } from "@/lib/mock-data";
import type { WakeLockStatus } from "@/hooks/useWakeLock";
import { formatElapsedKo, formatKoreanDate } from "@/lib/format";

interface NurseryTabProps {
  babyName: string;
  nowMs: number;
  todayKey: string;
  lastFeeding?: ActivityRecord;
  lastDiaper?: ActivityRecord;
  formulaMl: number;
  runningTimer: RunningTimer | null;
  hue: number;
  dim: number;
  onChangeHue: (value: number) => void;
  onChangeDim: (value: number) => void;
  keepAwake: boolean;
  onToggleKeepAwake: () => void;
  wakeLockStatus: WakeLockStatus;
  onQuickFormula: () => void;
  onQuickDiaper: (kind: "WET" | "SOLID" | "BOTH") => void;
  onStartTimer: (category: RunningTimer["category"], label: string) => void;
}

const WAKE_MESSAGE: Record<WakeLockStatus, string> = {
  active: "화면이 꺼지지 않도록 유지하고 있습니다.",
  off: "화면 켜짐 유지가 꺼져 있습니다.",
  unsupported: "이 브라우저는 화면 켜짐 유지를 지원하지 않습니다. 기기의 자동 잠금 시간을 늘려 주세요.",
  blocked: "저전력 모드 등으로 화면 켜짐 유지를 사용할 수 없습니다.",
};

// 어두운 방에서 한 손으로 누르는 큰 버튼
const TILE_BUTTON =
  "flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-2xl border border-white/25 bg-white/15 px-1 text-[15px] font-extrabold leading-tight transition-colors duration-150 active:bg-white/30 disabled:opacity-40";

export function NurseryTab({
  babyName,
  nowMs,
  todayKey,
  lastFeeding,
  lastDiaper,
  formulaMl,
  runningTimer,
  hue,
  dim,
  onChangeHue,
  onChangeDim,
  keepAwake,
  onToggleKeepAwake,
  wakeLockStatus,
  onQuickFormula,
  onQuickDiaper,
  onStartTimer,
}: NurseryTabProps) {
  const now = new Date(nowMs);
  const clock = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const timerBusy = runningTimer !== null;

  return (
    <div
      style={{ backgroundColor: `hsl(${hue}, 55%, ${Math.max(8, 26 - Math.round(dim / 3.5))}%)` }}
      className="space-y-4 rounded-3xl p-4 text-white shadow-xl transition-colors duration-300"
    >
      <div className="pt-2 text-center">
        <p className="text-6xl font-light tabular-nums tracking-tight">
          <time dateTime={now.toISOString()}>{clock}</time>
        </p>
        <p className="mt-1 text-sm text-white/85">
          {formatKoreanDate(todayKey)} · {babyName}
        </p>
      </div>

      {timerBusy && (
        <p role="status" className="rounded-2xl bg-black/30 px-4 py-3 text-center text-sm font-semibold">
          {runningTimer.label} 타이머가 진행 중입니다. 화면 위쪽에서 종료·저장할 수 있어요.
        </p>
      )}

      <section aria-labelledby="nursery-feed" className="space-y-3 rounded-2xl border border-white/15 bg-black/20 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 id="nursery-feed" className="flex items-center gap-2 text-lg font-bold">
            <Milk className="h-5 w-5" aria-hidden="true" />
            수유
          </h3>
          <p className="text-sm text-white/85">
            마지막 {lastFeeding ? formatElapsedKo(lastFeeding.startedAt, nowMs) : "기록 없음"}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={onQuickFormula} aria-label={`분유 ${formulaMl}ml 바로 기록`} className={TILE_BUTTON}>
            분유
            <span className="text-sm font-semibold text-white/85">{formulaMl}ml</span>
          </button>
          <button
            type="button"
            disabled={timerBusy}
            onClick={() => onStartTimer("FEEDING_LEFT", "모유 수유 (왼쪽)")}
            aria-label="모유 왼쪽 타이머 시작"
            className={TILE_BUTTON}
          >
            모유
            <span className="text-sm font-semibold text-white/85">왼쪽</span>
          </button>
          <button
            type="button"
            disabled={timerBusy}
            onClick={() => onStartTimer("FEEDING_RIGHT", "모유 수유 (오른쪽)")}
            aria-label="모유 오른쪽 타이머 시작"
            className={TILE_BUTTON}
          >
            모유
            <span className="text-sm font-semibold text-white/85">오른쪽</span>
          </button>
        </div>
      </section>

      <section aria-labelledby="nursery-diaper" className="space-y-3 rounded-2xl border border-white/15 bg-black/20 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 id="nursery-diaper" className="flex items-center gap-2 text-lg font-bold">
            <Baby className="h-5 w-5" aria-hidden="true" />
            기저귀
          </h3>
          <p className="text-sm text-white/85">
            마지막 {lastDiaper ? formatElapsedKo(lastDiaper.startedAt, nowMs) : "기록 없음"}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={() => onQuickDiaper("WET")} className={TILE_BUTTON}>
            소변
          </button>
          <button type="button" onClick={() => onQuickDiaper("SOLID")} className={TILE_BUTTON}>
            대변
          </button>
          <button type="button" onClick={() => onQuickDiaper("BOTH")} className={TILE_BUTTON}>
            둘 다
          </button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={timerBusy}
          onClick={() => onStartTimer("SLEEP", "수면")}
          className={`${TILE_BUTTON} min-h-20 bg-black/20`}
        >
          <Moon className="mb-1 h-5 w-5" aria-hidden="true" />
          수면 타이머
        </button>
        <button
          type="button"
          disabled={timerBusy}
          onClick={() => onStartTimer("PUMPING", "유축")}
          className={`${TILE_BUTTON} min-h-20 bg-black/20`}
        >
          <Droplets className="mb-1 h-5 w-5" aria-hidden="true" />
          유축 타이머
        </button>
      </div>

      <section aria-labelledby="nursery-display" className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
        <h3 id="nursery-display" className="sr-only">
          화면 설정
        </h3>

        <button
          type="button"
          role="switch"
          aria-checked={keepAwake}
          onClick={onToggleKeepAwake}
          className="flex min-h-12 w-full items-center justify-between gap-3 text-left"
        >
          <span className="flex items-center gap-2.5 text-[15px] font-bold">
            <Smartphone className="h-5 w-5" aria-hidden="true" />
            화면 켜짐 유지
          </span>
          <span
            aria-hidden="true"
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-150 ${
              keepAwake ? "bg-emerald-400" : "bg-white/30"
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-[left] duration-150 ${
                keepAwake ? "left-[22px]" : "left-0.5"
              }`}
            />
          </span>
        </button>
        <p role="status" className="-mt-2 text-sm text-white/85">
          {WAKE_MESSAGE[keepAwake ? wakeLockStatus : "off"]}
        </p>

        <div>
          <label htmlFor="nursery-dim" className="flex items-center justify-between text-[15px] font-bold">
            <span>화면 어둡게</span>
            <span className="tabular-nums text-white/85">{dim}%</span>
          </label>
          <input
            id="nursery-dim"
            type="range"
            min={0}
            max={65}
            value={dim}
            onChange={(e) => onChangeDim(Number(e.target.value))}
            className="mt-1 h-11 w-full cursor-pointer accent-emerald-300"
          />
        </div>

        <div>
          <label htmlFor="nursery-hue" className="flex items-center justify-between text-[15px] font-bold">
            <span>배경 색상</span>
            <span aria-hidden="true" className="h-5 w-5 rounded-full border border-white/50" style={{ backgroundColor: `hsl(${hue}, 55%, 45%)` }} />
          </label>
          <input
            id="nursery-hue"
            type="range"
            min={0}
            max={360}
            value={hue}
            onChange={(e) => onChangeHue(Number(e.target.value))}
            aria-valuetext={`색상 ${hue}도`}
            className="mt-1 h-11 w-full cursor-pointer accent-emerald-300"
          />
        </div>
      </section>
    </div>
  );
}
