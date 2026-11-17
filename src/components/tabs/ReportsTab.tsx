"use client";

import React, { useMemo, useState } from "react";
import { Plus, Ruler } from "lucide-react";
import type { ActivityRecord, GrowthItem } from "@/lib/mock-data";
import { computeFeedingBreakdown } from "@/lib/summary";

interface ReportsTabProps {
  babyName: string;
  birthDate: string;
  ageDays: number;
  ageMonths: number;
  growthRecords: GrowthItem[];
  // 최근 7일 활동 (수유 비율 계산용)
  recentActivities: ActivityRecord[];
  onAddGrowth: () => void;
}

type Metric = "WEIGHT" | "HEIGHT" | "HEAD";

const METRICS: Record<Metric, { label: string; unit: string; pick: (g: GrowthItem) => number }> = {
  WEIGHT: { label: "몸무게", unit: "kg", pick: (g) => g.weightKg },
  HEIGHT: { label: "키", unit: "cm", pick: (g) => g.heightCm },
  HEAD: { label: "머리둘레", unit: "cm", pick: (g) => g.headCm },
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const shortDate = (date: string) => {
  const [, m, d] = date.split("-");
  return `${Number(m)}/${Number(d)}`;
};

export function ReportsTab({
  babyName,
  birthDate,
  ageDays,
  ageMonths,
  growthRecords,
  recentActivities,
  onAddGrowth,
}: ReportsTabProps) {
  const [metric, setMetric] = useState<Metric>("WEIGHT");

  const sorted = useMemo(
    () => [...growthRecords].sort((a, b) => a.date.localeCompare(b.date)),
    [growthRecords]
  );

  // 지표별 최신값과 직전 측정 대비 변화량
  const latest = useMemo(() => {
    const result = {} as Record<Metric, { value: number; delta: number | null; date: string } | null>;
    (Object.keys(METRICS) as Metric[]).forEach((key) => {
      const points = sorted.filter((g) => METRICS[key].pick(g) > 0);
      if (points.length === 0) {
        result[key] = null;
        return;
      }
      const last = points[points.length - 1];
      const prev = points[points.length - 2];
      result[key] = {
        value: METRICS[key].pick(last),
        delta: prev ? round1(METRICS[key].pick(last) - METRICS[key].pick(prev)) : null,
        date: last.date,
      };
    });
    return result;
  }, [sorted]);

  const chart = useMemo(() => {
    const def = METRICS[metric];
    const points = sorted.filter((g) => def.pick(g) > 0).map((g) => ({ date: g.date, ageDays: g.ageDays, value: def.pick(g) }));
    if (points.length === 0) return null;
    const values = points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const x0 = points[0].ageDays;
    const xSpan = points[points.length - 1].ageDays - x0 || 1;
    const coords = points.map((p, i) => ({
      ...p,
      x: points.length === 1 ? 160 : 36 + ((p.ageDays - x0) / xSpan) * 256,
      y: 112 - ((p.value - min) / span) * 76,
      showLabel: points.length <= 6 || i === 0 || i === points.length - 1,
    }));
    return { coords, min, max };
  }, [sorted, metric]);

  const breakdown = useMemo(() => computeFeedingBreakdown(recentActivities), [recentActivities]);
  const def = METRICS[metric];

  return (
    <div className="space-y-4 pb-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-extrabold tracking-tight">{babyName} 성장 리포트</h2>
          <p className="text-sm text-muted">
            생후 {ageDays}일 ({ageMonths}개월)
            <span className="block tabular-nums">{birthDate} 출생</span>
          </p>
        </div>
        <button type="button" onClick={onAddGrowth} className="btn-primary shrink-0 px-3.5">
          <Plus className="h-5 w-5" aria-hidden="true" />
          측정 입력
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center dark:border-slate-600 dark:bg-slate-800/60">
          <Ruler className="mx-auto h-10 w-10 text-sprout-600 dark:text-sprout-300" aria-hidden="true" />
          <p className="mt-3 text-base font-bold">아직 신체 측정 기록이 없어요</p>
          <p className="mt-1 text-sm text-muted">몸무게, 키, 머리둘레를 입력하면 성장 추이를 그래프로 볼 수 있습니다.</p>
          <button type="button" onClick={onAddGrowth} className="btn-primary mt-4">
            <Plus className="h-5 w-5" aria-hidden="true" />첫 측정 기록하기
          </button>
        </div>
      ) : (
        <>
          {/* 지표 선택 카드 (최신값 + 직전 대비 변화) */}
          <div role="radiogroup" aria-label="성장 지표 선택" className="grid grid-cols-3 gap-2">
            {(Object.keys(METRICS) as Metric[]).map((key) => {
              const item = latest[key];
              const m = METRICS[key];
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={metric === key}
                  onClick={() => setMetric(key)}
                  className={`min-h-[92px] rounded-2xl border px-2.5 py-3 text-left transition-colors duration-150 ${
                    metric === key
                      ? "border-sprout-600 bg-sprout-50 ring-1 ring-sprout-600 dark:border-sprout-400 dark:bg-sprout-900/40 dark:ring-sprout-400"
                      : "border-slate-200 bg-slate-50 active:bg-slate-100 dark:border-slate-700 dark:bg-night-800 dark:active:bg-slate-700"
                  }`}
                >
                  <span className="block text-sm text-muted">{m.label}</span>
                  <span className="mt-0.5 block text-lg font-extrabold tabular-nums leading-tight">
                    {item ? `${item.value}` : "–"}
                    {item && <span className="ml-0.5 text-sm font-bold text-muted">{m.unit}</span>}
                  </span>
                  <span className="mt-0.5 block text-xs font-semibold tabular-nums text-sprout-700 dark:text-sprout-300">
                    {item?.delta != null ? `${item.delta >= 0 ? "+" : ""}${item.delta}${m.unit}` : item ? "첫 측정" : "미측정"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 성장 추이 차트 */}
          <section className="card p-4" aria-labelledby="growth-chart-heading">
            <h3 id="growth-chart-heading" className="text-base font-extrabold">
              {def.label} 추이
            </h3>
            {chart ? (
              <>
                <svg
                  viewBox="0 0 320 150"
                  role="img"
                  aria-label={`${def.label} 추이 그래프. ${chart.coords.map((c) => `${shortDate(c.date)} ${c.value}${def.unit}`).join(", ")}`}
                  className="mt-2 h-40 w-full overflow-visible"
                >
                  {[36, 74, 112].map((y) => (
                    <line key={y} x1="28" y1={y} x2="300" y2={y} stroke="currentColor" strokeDasharray="3 3" className="text-slate-300 dark:text-slate-600" />
                  ))}
                  {chart.coords.length > 1 && (
                    <polyline
                      points={chart.coords.map((c) => `${c.x},${c.y}`).join(" ")}
                      fill="none"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      stroke="currentColor"
                      className="text-sprout-600 dark:text-sprout-400"
                    />
                  )}
                  {chart.coords.map((c) => (
                    <g key={c.date}>
                      <circle cx={c.x} cy={c.y} r="4.5" strokeWidth="2" className="fill-white stroke-sprout-600 dark:fill-night-800 dark:stroke-sprout-400" />
                      {c.showLabel && (
                        <>
                          <text x={c.x} y={c.y - 10} textAnchor="middle" className="fill-slate-800 text-[11px] font-bold dark:fill-slate-100">
                            {c.value}
                          </text>
                          <text x={c.x} y="140" textAnchor="middle" className="fill-slate-600 text-[11px] dark:fill-slate-400">
                            {shortDate(c.date)}
                          </text>
                        </>
                      )}
                    </g>
                  ))}
                </svg>
                {chart.coords.length === 1 && (
                  <p className="text-sm text-muted">측정이 2회 이상 쌓이면 변화 추이가 선으로 이어집니다.</p>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">{def.label} 측정값이 아직 없습니다.</p>
            )}
          </section>

          {/* 측정 기록 목록 */}
          <section aria-labelledby="growth-list-heading">
            <h3 id="growth-list-heading" className="mb-2 text-base font-extrabold">
              측정 기록
            </h3>
            <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
              {[...sorted].reverse().map((g) => (
                <li key={g.id} className="bg-white px-4 py-3 dark:bg-night-900">
                  <p className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-bold tabular-nums">{g.date}</span>
                    <span className="text-sm text-muted">생후 {g.ageDays}일</span>
                  </p>
                  <p className="mt-0.5 text-[15px] font-semibold tabular-nums">
                    {[g.weightKg > 0 ? `${g.weightKg}kg` : null, g.heightCm > 0 ? `${g.heightCm}cm` : null, g.headCm > 0 ? `머리 ${g.headCm}cm` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {g.note && <p className="mt-0.5 text-sm text-muted">{g.note}</p>}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {/* 최근 7일 수유 유형 비율 */}
      <section className="card p-4" aria-labelledby="feeding-breakdown-heading">
        <h3 id="feeding-breakdown-heading" className="text-base font-extrabold">
          최근 7일 수유 비율
        </h3>
        {breakdown.total === 0 ? (
          <p className="mt-2 text-sm text-muted">최근 7일간 수유 기록이 없습니다.</p>
        ) : (
          <>
            <div aria-hidden="true" className="mt-3 flex h-4 w-full gap-px overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <span style={{ width: `${breakdown.formulaPct}%` }} className="h-full bg-sky-500" />
              <span style={{ width: `${breakdown.breastPct}%` }} className="h-full bg-sprout-500" />
              <span style={{ width: `${breakdown.solidPct}%` }} className="h-full bg-amber-500" />
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div className="flex items-center gap-1.5">
                <i aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-sky-500" />
                <dt className="text-muted">분유</dt>
                <dd className="font-bold tabular-nums">{breakdown.formulaPct}%</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <i aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-sprout-500" />
                <dt className="text-muted">모유</dt>
                <dd className="font-bold tabular-nums">{breakdown.breastPct}%</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <i aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />
                <dt className="text-muted">이유식</dt>
                <dd className="font-bold tabular-nums">{breakdown.solidPct}%</dd>
              </div>
            </dl>
            <p className="mt-2 text-sm text-muted">총 {breakdown.total}회 수유 기준</p>
          </>
        )}
      </section>
    </div>
  );
}
