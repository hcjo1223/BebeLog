"use client";

import React from "react";
import { BookOpen, LoaderCircle, Plus, Trophy } from "lucide-react";
import type { DiaryItem } from "@/lib/mock-data";
import { formatKoreanDate } from "@/lib/format";

interface DiaryTabProps {
  babyName: string;
  diaries: DiaryItem[];
  // 사진 업로드가 진행 중인 일기 ID
  uploadingIds: ReadonlySet<string>;
  onWrite: () => void;
}

export function DiaryTab({ babyName, diaries, uploadingIds, onWrite }: DiaryTabProps) {
  return (
    <div className="space-y-4 pb-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-extrabold tracking-tight">{babyName} 육아일기</h2>
          <p className="text-sm text-muted">그날의 수유·수면 요약이 함께 남습니다.</p>
        </div>
        {diaries.length > 0 && (
          <button type="button" onClick={onWrite} className="btn-primary shrink-0 px-3.5">
            <Plus className="h-5 w-5" aria-hidden="true" />
            일기 쓰기
          </button>
        )}
      </div>

      {diaries.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center dark:border-slate-600 dark:bg-slate-800/60">
          <BookOpen className="mx-auto h-10 w-10 text-sprout-600 dark:text-sprout-300" aria-hidden="true" />
          <p className="mt-3 text-base font-bold">첫 번째 일기를 남겨 보세요</p>
          <p className="mt-1 text-sm text-muted">오늘 {babyName}와 있었던 일을 한 줄만 적어도 충분해요.</p>
          <button type="button" onClick={onWrite} className="btn-primary mt-4">
            <Plus className="h-5 w-5" aria-hidden="true" />첫 일기 쓰기
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {diaries.map((entry) => {
            const s = entry.dailySummary;
            const hasSummary = s.totalFeedingMl > 0 || s.totalSleepHours > 0 || s.diaperCount > 0;
            return (
              <li key={entry.id}>
                <article className="card space-y-3 p-4">
                  <header className="flex items-start gap-3">
                    <span className="text-3xl leading-none" role="img" aria-label="오늘의 기분">
                      {entry.mood}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                        <time dateTime={entry.diaryDate}>{formatKoreanDate(entry.diaryDate)}</time>
                        <span>· {entry.author}</span>
                      </p>
                      <h3 className="mt-0.5 text-base font-extrabold leading-snug">{entry.title}</h3>
                      {entry.isMilestone && (
                        <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900 dark:bg-amber-900/50 dark:text-amber-200">
                          <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                          발달 이정표
                        </p>
                      )}
                    </div>
                  </header>

                  <p className="whitespace-pre-line text-[15px] leading-relaxed text-slate-800 dark:text-slate-200">
                    {entry.content}
                  </p>

                  {entry.photos.length > 0 && (
                    <ul className={`grid gap-1.5 ${entry.photos.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                      {entry.photos.map((photo, i) => (
                        <li
                          key={photo.id}
                          className={`overflow-hidden rounded-xl bg-slate-200 dark:bg-slate-700 ${
                            entry.photos.length === 1 ? "aspect-[4/3]" : "aspect-square"
                          }`}
                        >
                          {photo.type === "VIDEO" ? (
                            <video
                              src={photo.url}
                              controls
                              playsInline
                              preload="metadata"
                              aria-label={`${entry.title} 영상 ${i + 1}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <img
                              src={photo.url}
                              alt={`${entry.title} 사진 ${i + 1}`}
                              loading="lazy"
                              decoding="async"
                              className="h-full w-full object-cover"
                            />
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {uploadingIds.has(entry.id) && (
                    <p role="status" className="flex items-center gap-2 text-sm font-semibold text-sprout-700 dark:text-sprout-300">
                      <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                      사진을 올리는 중입니다…
                    </p>
                  )}

                  {hasSummary && (
                    <dl className="grid grid-cols-3 gap-2 rounded-xl bg-white p-2.5 text-center dark:bg-night-900">
                      <div>
                        <dd className="text-[15px] font-extrabold tabular-nums">{s.totalFeedingMl}ml</dd>
                        <dt className="text-xs text-muted">분유</dt>
                      </div>
                      <div>
                        <dd className="text-[15px] font-extrabold tabular-nums">{s.totalSleepHours}시간</dd>
                        <dt className="text-xs text-muted">수면</dt>
                      </div>
                      <div>
                        <dd className="text-[15px] font-extrabold tabular-nums">{s.diaperCount}회</dd>
                        <dt className="text-xs text-muted">기저귀</dt>
                      </div>
                    </dl>
                  )}

                  {entry.tags.length > 0 && (
                    <ul className="flex flex-wrap gap-1.5" aria-label="태그">
                      {entry.tags.map((tag) => (
                        <li
                          key={tag}
                          className="rounded-lg bg-sprout-100 px-2 py-1 text-sm font-semibold text-sprout-800 dark:bg-sprout-900/50 dark:text-sprout-200"
                        >
                          #{tag}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
