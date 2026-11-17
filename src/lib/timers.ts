import type { RunningTimer } from "@/lib/mock-data";

// Prisma ActiveTimer -> 프론트엔드 RunningTimer 변환 (bootstrap / timers API 공용)
export function mapActiveTimer(
  timer: {
    id: string;
    category: string;
    startedAt: Date;
    status: string;
    accumulatedSec: number;
    note: string | null;
    starter?: { name: string; households?: { relationLabel: string }[] } | null;
  },
  fallbackStarter: string
): RunningTimer {
  return {
    id: timer.id,
    category: timer.category as RunningTimer["category"],
    label: timer.note || timer.category,
    startedAt: timer.startedAt.getTime(),
    // 가족 내 호칭(엄마/아빠)을 우선 표시하고, 없으면 계정 이름을 쓴다
    startedBy:
      timer.starter?.households?.[0]?.relationLabel || timer.starter?.name || fallbackStarter,
    isPaused: timer.status === "PAUSED",
    accumulatedSec: timer.accumulatedSec,
  };
}
