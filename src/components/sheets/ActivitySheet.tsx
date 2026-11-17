"use client";

import React, { useState } from "react";
import { ChevronLeft } from "lucide-react";
import type { ActivityCategory } from "@/lib/mock-data";
import {
  DEFAULT_QUICK_FORM,
  describeTemperature,
  type QuickActivityForm,
} from "@/lib/activity-builders";
import { BottomSheet, ChipGroup, Stepper } from "@/components/ui/BottomSheet";
import { CATEGORY_META, CATEGORY_ORDER } from "@/components/category-meta";

interface ActivitySheetProps {
  // null이면 카테고리 선택 화면부터 시작한다 (하단 + 버튼)
  initialCategory: ActivityCategory | null;
  caregiver: string;
  // 마지막 분유량을 기본값으로 제안한다
  lastFormulaMl?: number;
  onSave: (form: QuickActivityForm) => void;
  onClose: () => void;
}

const TIME_OPTIONS = [
  { value: 0, label: "지금" },
  { value: 5, label: "5분 전" },
  { value: 15, label: "15분 전" },
  { value: 30, label: "30분 전" },
  { value: 60, label: "60분 전" },
] as const;

const preset = (values: readonly number[], unit: string) =>
  values.map((v) => ({ value: v, label: `${v}${unit}` }));

export function ActivitySheet({
  initialCategory,
  caregiver,
  lastFormulaMl,
  onSave,
  onClose,
}: ActivitySheetProps) {
  const [category, setCategory] = useState<ActivityCategory | null>(initialCategory);
  const [form, setForm] = useState<Omit<QuickActivityForm, "category">>(() => ({
    ...DEFAULT_QUICK_FORM,
    formulaMl: lastFormulaMl ?? DEFAULT_QUICK_FORM.formulaMl,
  }));
  const [noteError, setNoteError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // 1단계: 카테고리 선택 (엄지 영역의 큰 타일)
  if (!category) {
    return (
      <BottomSheet title="무엇을 기록할까요?" onClose={onClose}>
        <ul className="grid grid-cols-3 gap-2.5">
          {CATEGORY_ORDER.map((key) => {
            const meta = CATEGORY_META[key];
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => setCategory(key)}
                  className="flex min-h-[88px] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold transition-colors duration-150 active:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:active:bg-slate-700"
                >
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${meta.box}`}>
                    <meta.Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  {meta.label}
                </button>
              </li>
            );
          })}
        </ul>
      </BottomSheet>
    );
  }

  const meta = CATEGORY_META[category];
  const needsNote = category === "NOTE";
  const hasDuration =
    category === "SLEEP" ||
    category === "TUMMY_TIME" ||
    (category === "FEEDING" && form.feedingType === "BREAST");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (needsNote && !form.note.trim()) {
      setNoteError("메모 내용을 입력해 주세요.");
      document.getElementById("activity-note")?.focus();
      return;
    }
    onSave({ ...form, category });
  };

  return (
    <BottomSheet
      title={meta.sheetTitle}
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <button type="submit" className="btn-primary w-full text-base">
          {caregiver} 이름으로 저장
        </button>
      }
    >
      {initialCategory === null && (
        <button
          type="button"
          onClick={() => setCategory(null)}
          className="-ml-2 -mt-1 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-sprout-700 dark:text-sprout-300"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          다른 항목 선택
        </button>
      )}

      {category === "FEEDING" && (
        <>
          <ChipGroup
            label="수유 종류"
            value={form.feedingType}
            onChange={(v) => set("feedingType", v)}
            options={[
              { value: "FORMULA", label: "분유" },
              { value: "BREAST", label: "모유" },
              { value: "SOLID_FOOD", label: "이유식" },
            ]}
          />
          {form.feedingType === "FORMULA" && (
            <>
              <Stepper label="분유량" value={form.formulaMl} unit="ml" step={10} min={10} max={400} onChange={(v) => set("formulaMl", v)} />
              <ChipGroup label="자주 쓰는 분유량" hideLabel columns={5} value={form.formulaMl} onChange={(v) => set("formulaMl", v)} options={preset([80, 120, 160, 200, 240], "")} />
            </>
          )}
          {form.feedingType === "SOLID_FOOD" && (
            <>
              <Stepper label="이유식 양" value={form.solidG} unit="g" step={10} min={10} max={400} onChange={(v) => set("solidG", v)} />
              <ChipGroup label="자주 쓰는 이유식 양" hideLabel columns={5} value={form.solidG} onChange={(v) => set("solidG", v)} options={preset([30, 50, 80, 100, 150], "")} />
            </>
          )}
          {form.feedingType === "BREAST" && (
            <>
              <ChipGroup
                label="수유한 쪽"
                value={form.breastSide}
                onChange={(v) => set("breastSide", v)}
                options={[
                  { value: "LEFT", label: "왼쪽" },
                  { value: "RIGHT", label: "오른쪽" },
                  { value: "BOTH", label: "양쪽" },
                ]}
              />
              <Stepper label="수유 시간" value={form.breastMinutes} unit="분" step={1} min={1} max={90} onChange={(v) => set("breastMinutes", v)} />
              <ChipGroup label="자주 쓰는 수유 시간" hideLabel columns={5} value={form.breastMinutes} onChange={(v) => set("breastMinutes", v)} options={preset([5, 10, 15, 20, 30], "분")} />
            </>
          )}
        </>
      )}

      {category === "DIAPER" && (
        <>
          <ChipGroup
            label="기저귀 상태"
            value={form.diaperType}
            onChange={(v) => set("diaperType", v)}
            options={[
              { value: "WET", label: "소변" },
              { value: "SOLID", label: "대변" },
              { value: "BOTH", label: "둘 다" },
            ]}
          />
          {form.diaperType !== "WET" && (
            <ChipGroup
              label="변 색상"
              value={form.stoolColor}
              onChange={(v) => set("stoolColor", v)}
              options={[
                { value: "YELLOW", label: <><i aria-hidden="true" className="h-3 w-3 rounded-full border border-black/10 bg-yellow-400" />황금색</> },
                { value: "BROWN", label: <><i aria-hidden="true" className="h-3 w-3 rounded-full border border-black/10 bg-amber-800" />갈색</> },
                { value: "GREEN", label: <><i aria-hidden="true" className="h-3 w-3 rounded-full border border-black/10 bg-green-700" />녹색</> },
              ]}
            />
          )}
        </>
      )}

      {category === "SLEEP" && (
        <>
          <Stepper label="수면 시간" value={form.sleepMinutes} unit="분" step={5} min={5} max={720} onChange={(v) => set("sleepMinutes", v)} />
          <ChipGroup label="자주 쓰는 수면 시간" hideLabel columns={5} value={form.sleepMinutes} onChange={(v) => set("sleepMinutes", v)} options={preset([30, 60, 90, 120, 180], "분")} />
          <p className="text-sm text-muted">
            지금 막 깬 경우가 아니라면 아래 &lsquo;언제&rsquo;에서 깬 시각을 선택해 주세요. 실시간으로 재려면 홈의 수면 타이머를 사용하세요.
          </p>
        </>
      )}

      {category === "TEMPERATURE" && (
        <>
          <Stepper label="체온" value={form.temperature} unit="°C" step={0.1} min={34} max={42} onChange={(v) => set("temperature", v)} format={(v) => v.toFixed(1)} />
          <ChipGroup label="자주 쓰는 체온" hideLabel columns={4} value={form.temperature} onChange={(v) => set("temperature", v)} options={[36.5, 37, 37.5, 38].map((v) => ({ value: v, label: v.toFixed(1) }))} />
          <p
            role="status"
            className={`rounded-xl px-3.5 py-2.5 text-sm font-semibold ${
              form.temperature >= 37.5
                ? "bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200"
                : "bg-sprout-50 text-sprout-800 dark:bg-sprout-900/40 dark:text-sprout-200"
            }`}
          >
            {describeTemperature(form.temperature)}
          </p>
        </>
      )}

      {category === "MEDICATION" && (
        <div>
          <label htmlFor="medicine-name" className="field-label">
            약 이름 <span className="font-normal text-muted">(선택)</span>
          </label>
          <input
            id="medicine-name"
            type="text"
            value={form.medicineName}
            onChange={(e) => set("medicineName", e.target.value)}
            maxLength={40}
            placeholder="예: 비타민 D, 해열제"
            className="field"
          />
        </div>
      )}

      {category === "PUMPING" && (
        <>
          <Stepper label="유축량" value={form.pumpMl} unit="ml" step={10} min={10} max={500} onChange={(v) => set("pumpMl", v)} />
          <ChipGroup label="자주 쓰는 유축량" hideLabel columns={5} value={form.pumpMl} onChange={(v) => set("pumpMl", v)} options={preset([40, 60, 100, 120, 150], "")} />
        </>
      )}

      {category === "TUMMY_TIME" && (
        <>
          <Stepper label="터미타임" value={form.tummyMinutes} unit="분" step={1} min={1} max={60} onChange={(v) => set("tummyMinutes", v)} />
          <ChipGroup label="자주 쓰는 터미타임" hideLabel columns={4} value={form.tummyMinutes} onChange={(v) => set("tummyMinutes", v)} options={preset([3, 5, 10, 15], "분")} />
        </>
      )}

      <ChipGroup
        label={hasDuration ? "언제 끝났나요" : "언제"}
        columns={5}
        value={form.minutesAgo}
        onChange={(v) => set("minutesAgo", v)}
        options={TIME_OPTIONS.map((o) => ({ value: o.value as number, label: <span className="text-[13px]">{o.label}</span> }))}
      />

      <div>
        <label htmlFor="activity-note" className="field-label">
          메모 {!needsNote && <span className="font-normal text-muted">(선택)</span>}
        </label>
        <input
          id="activity-note"
          type="text"
          value={form.note}
          onChange={(e) => {
            set("note", e.target.value);
            if (noteError) setNoteError(null);
          }}
          maxLength={200}
          aria-invalid={noteError ? true : undefined}
          aria-describedby={noteError ? "activity-note-error" : undefined}
          placeholder={needsNote ? "예: 오늘 컨디션이 좋아요" : "특이사항이 있으면 적어 주세요"}
          className="field"
        />
        {noteError && (
          <p id="activity-note-error" role="alert" className="field-error">
            {noteError}
          </p>
        )}
      </div>
    </BottomSheet>
  );
}
