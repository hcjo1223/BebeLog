"use client";

import React, { useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";

export interface GrowthFormValues {
  date: string;
  weightKg?: number;
  heightCm?: number;
  headCm?: number;
  note: string;
}

interface GrowthSheetProps {
  babyName: string;
  todayKey: string;
  birthDate: string;
  onSave: (values: GrowthFormValues) => void;
  onClose: () => void;
}

const parsePositive = (raw: string): number | undefined => {
  const n = Number.parseFloat(raw.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export function GrowthSheet({ babyName, todayKey, birthDate, onSave, onClose }: GrowthSheetProps) {
  const [date, setDate] = useState(todayKey);
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [head, setHead] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const weightKg = parsePositive(weight);
    const heightCm = parsePositive(height);
    const headCm = parsePositive(head);
    if (weightKg === undefined && heightCm === undefined && headCm === undefined) {
      setError("몸무게, 키, 머리둘레 중 하나 이상을 입력해 주세요.");
      document.getElementById("growth-weight")?.focus();
      return;
    }
    if ((weightKg ?? 0) > 40 || (heightCm ?? 0) > 150 || (headCm ?? 0) > 70) {
      setError("입력한 값이 너무 큽니다. 단위(kg, cm)를 확인해 주세요.");
      return;
    }
    onSave({ date, weightKg, heightCm, headCm, note: note.trim() });
  };

  const fields = [
    { id: "growth-weight", label: "몸무게", unit: "kg", value: weight, set: setWeight, placeholder: "6.5" },
    { id: "growth-height", label: "키", unit: "cm", value: height, set: setHeight, placeholder: "63.0" },
    { id: "growth-head", label: "머리둘레", unit: "cm", value: head, set: setHead, placeholder: "41.0" },
  ];

  return (
    <BottomSheet
      title={`${babyName} 신체 측정`}
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <button type="submit" className="btn-primary w-full text-base">
          측정 기록 저장
        </button>
      }
    >
      <p className="text-sm text-muted">측정한 항목만 입력하면 됩니다.</p>

      <div className="grid grid-cols-3 gap-2.5">
        {fields.map((f) => (
          <div key={f.id}>
            <label htmlFor={f.id} className="field-label">
              {f.label} <span className="font-normal text-muted">({f.unit})</span>
            </label>
            <input
              id={f.id}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={f.value}
              onChange={(e) => {
                f.set(e.target.value);
                if (error) setError(null);
              }}
              placeholder={f.placeholder}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "growth-error" : undefined}
              className="field px-3 tabular-nums"
            />
          </div>
        ))}
      </div>
      {error && (
        <p id="growth-error" role="alert" className="field-error !mt-0">
          {error}
        </p>
      )}

      <div>
        <label htmlFor="growth-date" className="field-label">
          측정일
        </label>
        <input
          id="growth-date"
          type="date"
          required
          value={date}
          min={birthDate}
          max={todayKey}
          onChange={(e) => setDate(e.target.value || todayKey)}
          className="field"
        />
      </div>

      <div>
        <label htmlFor="growth-note" className="field-label">
          메모 <span className="font-normal text-muted">(선택)</span>
        </label>
        <input
          id="growth-note"
          type="text"
          value={note}
          maxLength={200}
          onChange={(e) => setNote(e.target.value)}
          placeholder="예: 2개월 영유아 검진"
          className="field"
        />
      </div>
    </BottomSheet>
  );
}
