"use client";

import React, { useEffect, useRef, useState } from "react";
import { ImagePlus, LoaderCircle, Trophy, X } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { MAX_MEDIA_PER_DIARY, validateMediaFile } from "@/lib/media-rules";

export interface DiaryFormValues {
  title: string;
  content: string;
  mood: string;
  tags: string[];
  isMilestone: boolean;
  files: File[];
}

interface DiarySheetProps {
  babyName: string;
  // 사진 첨부 가능 여부. 저장소 미설정이면 안내만 보여준다
  attachMode: "enabled" | "preview-only" | "unavailable";
  // 실패 시 사용자에게 보여줄 메시지를 반환한다 (성공하면 null)
  onSave: (values: DiaryFormValues) => Promise<string | null>;
  onClose: () => void;
}

const MOODS = [
  { emoji: "🥰", label: "사랑스러움" },
  { emoji: "😊", label: "기쁨" },
  { emoji: "😴", label: "졸림" },
  { emoji: "😭", label: "힘듦" },
  { emoji: "🤒", label: "아픔" },
] as const;

interface PickedFile {
  file: File;
  previewUrl: string;
  kind: "IMAGE" | "VIDEO";
}

export function DiarySheet({ babyName, attachMode, onSave, onClose }: DiarySheetProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<string>(MOODS[0].emoji);
  const [tags, setTags] = useState("");
  const [isMilestone, setIsMilestone] = useState(false);
  const [picked, setPicked] = useState<PickedFile[]>([]);
  const [errors, setErrors] = useState<{ content?: string; files?: string; form?: string }>({});
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickedRef = useRef<PickedFile[]>([]);
  pickedRef.current = picked;

  // 미리보기용 Object URL 정리
  useEffect(() => {
    return () => {
      pickedRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (incoming.length === 0) return;

    const accepted: PickedFile[] = [];
    let message: string | undefined;
    for (const file of incoming) {
      if (picked.length + accepted.length >= MAX_MEDIA_PER_DIARY) {
        message = `사진과 영상은 최대 ${MAX_MEDIA_PER_DIARY}개까지 첨부할 수 있습니다.`;
        break;
      }
      const result = validateMediaFile(file.type, file.size);
      if (!result.ok) {
        message = `${file.name}: ${result.message}`;
        continue;
      }
      accepted.push({ file, previewUrl: URL.createObjectURL(file), kind: result.kind });
    }
    setPicked((prev) => [...prev, ...accepted]);
    setErrors((prev) => ({ ...prev, files: message }));
  };

  const removeFile = (index: number) => {
    setPicked((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
    setErrors((prev) => ({ ...prev, files: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!content.trim()) {
      setErrors((prev) => ({ ...prev, content: "오늘의 이야기를 한 줄이라도 적어 주세요." }));
      document.getElementById("diary-content")?.focus();
      return;
    }
    setSaving(true);
    setErrors((prev) => ({ ...prev, form: undefined }));
    const message = await onSave({
      title: title.trim(),
      content: content.trim(),
      mood,
      tags: tags
        .split(/[,\s]+/)
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean)
        .slice(0, 10),
      isMilestone,
      files: picked.map((p) => p.file),
    });
    // 성공하면 부모가 시트를 닫는다. 실패했을 때만 상태를 되돌린다
    if (message) {
      setSaving(false);
      setErrors((prev) => ({ ...prev, form: message }));
    }
  };

  return (
    <BottomSheet
      title="육아일기 쓰기"
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <>
          {errors.form && (
            <p role="alert" className="mb-2.5 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-semibold text-rose-800 dark:bg-rose-950/50 dark:text-rose-200">
              {errors.form}
            </p>
          )}
          <button type="submit" disabled={saving} className="btn-primary w-full text-base">
            {saving && <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />}
            {saving ? "저장하는 중…" : "일기 저장"}
          </button>
        </>
      }
    >
      <div>
        <p id="diary-mood-label" className="field-label">
          오늘의 기분
        </p>
        <div role="radiogroup" aria-labelledby="diary-mood-label" className="grid grid-cols-5 gap-2">
          {MOODS.map((m) => (
            <button
              key={m.emoji}
              type="button"
              role="radio"
              aria-checked={mood === m.emoji}
              aria-label={m.label}
              onClick={() => setMood(m.emoji)}
              className="chip h-12 px-0 text-2xl aria-checked:!bg-sprout-100 dark:aria-checked:!bg-sprout-900"
            >
              <span aria-hidden="true">{m.emoji}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="diary-title" className="field-label">
          제목 <span className="font-normal text-muted">(선택)</span>
        </label>
        <input
          id="diary-title"
          type="text"
          value={title}
          maxLength={100}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 처음 뒤집기에 성공한 날"
          className="field"
        />
      </div>

      <div>
        <label htmlFor="diary-content" className="field-label">
          오늘의 이야기
        </label>
        <textarea
          id="diary-content"
          rows={5}
          value={content}
          maxLength={3000}
          onChange={(e) => {
            setContent(e.target.value);
            if (errors.content) setErrors((prev) => ({ ...prev, content: undefined }));
          }}
          aria-invalid={errors.content ? true : undefined}
          aria-describedby={errors.content ? "diary-content-error" : "diary-content-hint"}
          placeholder={`${babyName}의 특별한 순간을 기록해 보세요.`}
          className="field leading-relaxed"
        />
        {errors.content ? (
          <p id="diary-content-error" role="alert" className="field-error">
            {errors.content}
          </p>
        ) : (
          <p id="diary-content-hint" className="mt-1.5 text-sm text-muted">
            오늘의 수유·수면·기저귀 요약이 일기에 함께 저장됩니다.
          </p>
        )}
      </div>

      <div>
        <p className="field-label">사진 · 영상</p>
        {attachMode === "unavailable" ? (
          <p className="rounded-xl bg-slate-100 px-3.5 py-3 text-sm text-muted dark:bg-slate-800">
            사진 저장소가 아직 연결되지 않아 글만 저장할 수 있습니다. 서버에 OCI Object Storage 설정을 추가하면 첨부할 수 있습니다.
          </p>
        ) : (
          <>
            <ul className="grid grid-cols-3 gap-2">
              {picked.map((p, index) => (
                <li key={p.previewUrl} className="relative aspect-square overflow-hidden rounded-xl bg-slate-200 dark:bg-slate-700">
                  {p.kind === "IMAGE" ? (
                    <img src={p.previewUrl} alt={`첨부 사진 ${index + 1}`} className="h-full w-full object-cover" />
                  ) : (
                    <video src={p.previewUrl} muted playsInline preload="metadata" aria-label={`첨부 영상 ${index + 1}`} className="h-full w-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    aria-label={`첨부 ${index + 1} 삭제`}
                    className="absolute right-0 top-0 flex h-11 w-11 items-start justify-end p-1.5"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/75 text-white">
                      <X className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </button>
                </li>
              ))}
              {picked.length < MAX_MEDIA_PER_DIARY && (
                <li>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 text-sm font-semibold text-slate-600 transition-colors active:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:active:bg-slate-700"
                  >
                    <ImagePlus className="h-6 w-6" aria-hidden="true" />
                    추가
                  </button>
                </li>
              )}
            </ul>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,video/mp4,video/quicktime,video/webm"
              multiple
              onChange={handleFiles}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
            />
            <p className="mt-1.5 text-sm text-muted">
              {attachMode === "preview-only"
                ? "샘플 모드에서는 사진이 이 기기에서만 보이고 저장되지 않습니다."
                : `최대 ${MAX_MEDIA_PER_DIARY}개 · 사진 10MB, 영상 50MB 이하`}
            </p>
            {errors.files && (
              <p role="alert" className="field-error">
                {errors.files}
              </p>
            )}
          </>
        )}
      </div>

      <div>
        <label htmlFor="diary-tags" className="field-label">
          태그 <span className="font-normal text-muted">(선택 · 쉼표나 띄어쓰기로 구분)</span>
        </label>
        <input
          id="diary-tags"
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="첫뒤집기, 100일"
          autoCapitalize="none"
          className="field"
        />
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={isMilestone}
        onClick={() => setIsMilestone((v) => !v)}
        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-slate-300 px-3.5 text-left dark:border-slate-600"
      >
        <span className="flex items-center gap-2.5">
          <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <span>
            <span className="block text-sm font-bold">발달 이정표로 표시</span>
            <span className="block text-sm text-muted">첫 뒤집기, 첫 걸음마 같은 순간</span>
          </span>
        </span>
        <span
          aria-hidden="true"
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-150 ${
            isMilestone ? "bg-sprout-600" : "bg-slate-300 dark:bg-slate-600"
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-[left] duration-150 ${
              isMilestone ? "left-[22px]" : "left-0.5"
            }`}
          />
        </span>
      </button>
    </BottomSheet>
  );
}
