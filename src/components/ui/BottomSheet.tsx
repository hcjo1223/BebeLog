"use client";

import React, { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

interface BottomSheetProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  // 시트 하단에 고정되는 주요 액션 영역 (엄지 영역)
  footer?: React.ReactNode;
  // form으로 감싸야 할 때 사용
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// 접근 가능한 바텀 시트: 포커스 가둠, Esc/배경 탭으로 닫기, 배경 스크롤 잠금,
// 홈 인디케이터 안전 영역 대응
export function BottomSheet({ title, onClose, children, footer, onSubmit }: BottomSheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  const body = (
    <>
      <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-1">
        <h2 id={titleId} className="text-lg font-extrabold tracking-tight">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="icon-btn -mr-2 text-slate-600 hover:bg-slate-100 active:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 dark:active:bg-slate-600"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 pb-4 pt-1">
        {children}
      </div>
      {footer && (
        <div className="border-t border-slate-200 px-5 pt-3 dark:border-slate-700">
          {footer}
        </div>
      )}
    </>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* 배경 스크림: 탭하면 닫힌다 (스크린리더에서는 닫기 버튼을 사용) */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-slate-950/60"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex max-h-[92dvh] w-full max-w-[480px] animate-sheet-up flex-col rounded-t-3xl bg-white pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl outline-none dark:bg-night-800"
      >
        <div aria-hidden="true" className="mx-auto mb-1 mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
        {onSubmit ? (
          <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
            {body}
          </form>
        ) : (
          body
        )}
      </div>
    </div>
  );
}

// +/- 버튼으로 값을 조절하는 스테퍼 (한 손 조작용 큰 버튼)
interface StepperProps {
  label: string;
  value: number;
  unit: string;
  step: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  format?: (value: number) => string;
}

export function Stepper({ label, value, unit, step, min, max, onChange, format }: StepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n * 10) / 10));
  const display = format ? format(value) : String(value);
  return (
    <div role="group" aria-label={label} className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={() => onChange(clamp(value - step))}
        disabled={value <= min}
        aria-label={`${label} ${step}${unit} 줄이기`}
        className="btn-secondary h-14 w-14 rounded-2xl px-0 text-2xl"
      >
        −
      </button>
      <p className="text-center" aria-live="polite">
        <span className="text-4xl font-extrabold tabular-nums tracking-tight text-sprout-700 dark:text-sprout-300">
          {display}
        </span>
        <span className="ml-1 text-base font-bold text-muted">{unit}</span>
      </p>
      <button
        type="button"
        onClick={() => onChange(clamp(value + step))}
        disabled={value >= max}
        aria-label={`${label} ${step}${unit} 늘리기`}
        className="btn-secondary h-14 w-14 rounded-2xl px-0 text-2xl"
      >
        +
      </button>
    </div>
  );
}

// 라디오 그룹처럼 동작하는 칩 묶음
interface ChipGroupProps<T extends string | number> {
  label: string;
  options: readonly { value: T; label: React.ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  columns?: 2 | 3 | 4 | 5;
  hideLabel?: boolean;
}

const GRID_COLS = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4", 5: "grid-cols-5" } as const;

export function ChipGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
  columns = 3,
  hideLabel = false,
}: ChipGroupProps<T>) {
  const labelId = useId();
  return (
    <div>
      <p id={labelId} className={hideLabel ? "sr-only" : "field-label"}>
        {label}
      </p>
      <div role="radiogroup" aria-labelledby={labelId} className={`grid gap-2 ${GRID_COLS[columns]}`}>
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={value === opt.value}
            onClick={() => onChange(opt.value)}
            className="chip px-1.5"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
