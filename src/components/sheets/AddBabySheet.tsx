"use client";

import React, { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { BottomSheet, ChipGroup } from "@/components/ui/BottomSheet";

export interface NewBabyValues {
  name: string;
  birthDate: string;
  dueDate?: string;
  gender: "M" | "F" | "UNKNOWN";
}

interface AddBabySheetProps {
  todayKey: string;
  // 실패 시 사용자에게 보여줄 메시지를 반환한다
  onSubmit: (values: NewBabyValues) => Promise<string | null>;
  onClose: () => void;
}

export function AddBabySheet({ todayKey, onSubmit, onClose }: AddBabySheetProps) {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [gender, setGender] = useState<NewBabyValues["gender"]>("UNKNOWN");
  const [errors, setErrors] = useState<{ name?: string; birthDate?: string; form?: string }>({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!name.trim()) next.name = "아기 이름이나 태명을 입력해 주세요.";
    if (!birthDate) next.birthDate = "생년월일을 선택해 주세요.";
    else if (birthDate > todayKey) next.birthDate = "생년월일은 오늘 이후일 수 없습니다.";
    setErrors(next);
    if (next.name) {
      document.getElementById("baby-name")?.focus();
      return;
    }
    if (next.birthDate) {
      document.getElementById("baby-birth")?.focus();
      return;
    }

    setSaving(true);
    const message = await onSubmit({
      name: name.trim(),
      birthDate,
      dueDate: dueDate || undefined,
      gender,
    });
    setSaving(false);
    if (message) setErrors({ form: message });
  };

  return (
    <BottomSheet
      title="아기 추가"
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <button type="submit" disabled={saving} className="btn-primary w-full text-base">
          {saving && <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />}
          {saving ? "추가하는 중…" : "아기 프로필 추가"}
        </button>
      }
    >
      <p className="text-sm text-muted">둘째나 쌍둥이를 추가하면 상단에서 바로 전환해 기록할 수 있습니다.</p>

      <div>
        <label htmlFor="baby-name" className="field-label">
          이름 또는 태명
        </label>
        <input
          id="baby-name"
          type="text"
          value={name}
          maxLength={30}
          autoComplete="off"
          onChange={(e) => setName(e.target.value)}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "baby-name-error" : undefined}
          className="field"
        />
        {errors.name && (
          <p id="baby-name-error" role="alert" className="field-error">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="baby-birth" className="field-label">
          생년월일
        </label>
        <input
          id="baby-birth"
          type="date"
          value={birthDate}
          max={todayKey}
          onChange={(e) => setBirthDate(e.target.value)}
          aria-invalid={errors.birthDate ? true : undefined}
          aria-describedby={errors.birthDate ? "baby-birth-error" : undefined}
          className="field"
        />
        {errors.birthDate && (
          <p id="baby-birth-error" role="alert" className="field-error">
            {errors.birthDate}
          </p>
        )}
      </div>

      <ChipGroup
        label="성별"
        value={gender}
        onChange={setGender}
        options={[
          { value: "F", label: "여아" },
          { value: "M", label: "남아" },
          { value: "UNKNOWN", label: "선택 안 함" },
        ]}
      />

      <div>
        <label htmlFor="baby-due" className="field-label">
          출산 예정일 <span className="font-normal text-muted">(선택 · 이른둥이 교정일수 계산용)</span>
        </label>
        <input
          id="baby-due"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="field"
        />
      </div>

      {errors.form && (
        <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-semibold text-rose-800 dark:bg-rose-950/50 dark:text-rose-200">
          {errors.form}
        </p>
      )}
    </BottomSheet>
  );
}
