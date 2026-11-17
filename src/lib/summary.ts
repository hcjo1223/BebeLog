// ============================================================================
// 육아 기록 집계용 순수 함수 (일일 요약, 수유 비율, 타이머 경과 시간)
// ============================================================================
import type { ActivityRecord, RunningTimer } from "@/lib/mock-data";
import { getTimePeriodLabel, parseDateKey, toDateKey, type TimePeriod } from "@/lib/format";

export interface DailySummary {
  feedingCount: number;
  formulaMl: number;
  bottleCount: number;
  breastCount: number;
  breastLeftMin: number;
  breastRightMin: number;
  solidCount: number;
  totalSleepMin: number;
  awakeMin: number;
  wetCount: number;
  poopCount: number;
  medCount: number;
  noteCount: number;
  pumpMl: number;
  tummyCount: number;
  tummyMin: number;
  lastTemperature?: number;
}

const toMin = (sec: number | undefined) => Math.round((sec ?? 0) / 60);

function breastMinutes(act: ActivityRecord): { left: number; right: number } {
  const d = act.details ?? {};
  if (typeof d.leftDurationSec === "number" || typeof d.rightDurationSec === "number") {
    return {
      left: toMin(d.leftDurationSec as number | undefined),
      right: toMin(d.rightDurationSec as number | undefined),
    };
  }
  const total = toMin(act.durationSec);
  const side = d.side ?? d.breastSide;
  if (side === "LEFT" || d.timerCategory === "FEEDING_LEFT") return { left: total, right: 0 };
  if (side === "RIGHT" || d.timerCategory === "FEEDING_RIGHT") return { left: 0, right: total };
  return { left: Math.floor(total / 2), right: Math.ceil(total / 2) };
}

export type FeedingKind = "FORMULA" | "BREAST" | "SOLID";

export function getFeedingKind(act: ActivityRecord): FeedingKind {
  const type = act.details?.feedingType;
  if (type === "SOLID_FOOD") return "SOLID";
  if (type === "BREAST") return "BREAST";
  if (type === "FORMULA" || type === "PUMPED_MILK") return "FORMULA";
  return act.amountMl ? "FORMULA" : "BREAST";
}

// 특정 날짜(dayKey, 로컬 시간대)의 활동만 집계한다
export function computeDailySummary(
  activities: ActivityRecord[],
  dayKey: string,
  nowMs: number
): DailySummary {
  const s: DailySummary = {
    feedingCount: 0,
    formulaMl: 0,
    bottleCount: 0,
    breastCount: 0,
    breastLeftMin: 0,
    breastRightMin: 0,
    solidCount: 0,
    totalSleepMin: 0,
    awakeMin: 0,
    wetCount: 0,
    poopCount: 0,
    medCount: 0,
    noteCount: 0,
    pumpMl: 0,
    tummyCount: 0,
    tummyMin: 0,
  };

  let latestTempAt = -Infinity;

  for (const act of activities) {
    if (toDateKey(act.startedAt) !== dayKey) continue;

    switch (act.category) {
      case "FEEDING": {
        s.feedingCount += 1;
        const kind = getFeedingKind(act);
        if (kind === "SOLID") {
          s.solidCount += 1;
        } else if (kind === "FORMULA") {
          s.bottleCount += 1;
          s.formulaMl += act.amountMl ?? 0;
        } else {
          s.breastCount += 1;
          const { left, right } = breastMinutes(act);
          s.breastLeftMin += left;
          s.breastRightMin += right;
        }
        break;
      }
      case "SLEEP":
        s.totalSleepMin += toMin(act.durationSec);
        break;
      case "DIAPER": {
        const type = act.details?.diaperType;
        if (type === "SOLID") s.poopCount += 1;
        else if (type === "BOTH") {
          s.wetCount += 1;
          s.poopCount += 1;
        } else s.wetCount += 1;
        break;
      }
      case "MEDICATION":
        s.medCount += 1;
        break;
      case "NOTE":
        s.noteCount += 1;
        break;
      case "PUMPING":
        s.pumpMl += act.amountMl ?? 0;
        break;
      case "TUMMY_TIME":
        s.tummyCount += 1;
        s.tummyMin += toMin(act.durationSec);
        break;
      case "TEMPERATURE": {
        const at = new Date(act.startedAt).getTime();
        if (typeof act.valueNum === "number" && at > latestTempAt) {
          latestTempAt = at;
          s.lastTemperature = act.valueNum;
        }
        break;
      }
      default:
        break;
    }
  }

  // 깨어 있던 시간 = 그날 지금까지 흐른 시간 - 수면 시간
  const dayStart = parseDateKey(dayKey).getTime();
  const elapsedMin = Math.min(
    24 * 60,
    Math.max(0, Math.floor((nowMs - dayStart) / 60000))
  );
  s.awakeMin = Math.max(0, elapsedMin - s.totalSleepMin);

  return s;
}

// 카테고리별 가장 최근 기록 (날짜와 무관하게 "마지막 수유로부터 경과" 표시에 사용)
export function findLatestByCategory(
  activities: ActivityRecord[],
  category: ActivityRecord["category"]
): ActivityRecord | undefined {
  let latest: ActivityRecord | undefined;
  for (const act of activities) {
    if (act.category !== category) continue;
    if (!latest || act.startedAt > latest.startedAt) latest = act;
  }
  return latest;
}

const PERIOD_ORDER: TimePeriod[] = ["밤", "오후", "오전", "새벽"];

// 하루 타임라인을 시간대별로 묶는다 (최신순)
export function groupActivitiesByPeriod(
  activities: ActivityRecord[],
  dayKey: string
): [TimePeriod, ActivityRecord[]][] {
  const groups = new Map<TimePeriod, ActivityRecord[]>();
  const sorted = activities
    .filter((a) => toDateKey(a.startedAt) === dayKey)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  for (const act of sorted) {
    const label = getTimePeriodLabel(act.startedAt);
    const list = groups.get(label);
    if (list) list.push(act);
    else groups.set(label, [act]);
  }

  return PERIOD_ORDER.filter((p) => groups.has(p)).map(
    (p) => [p, groups.get(p)!] as [TimePeriod, ActivityRecord[]]
  );
}

export interface FeedingBreakdown {
  total: number;
  formulaPct: number;
  breastPct: number;
  solidPct: number;
}

export function computeFeedingBreakdown(activities: ActivityRecord[]): FeedingBreakdown {
  let formula = 0;
  let breast = 0;
  let solid = 0;
  for (const act of activities) {
    if (act.category !== "FEEDING") continue;
    const kind = getFeedingKind(act);
    if (kind === "FORMULA") formula += 1;
    else if (kind === "BREAST") breast += 1;
    else solid += 1;
  }
  const total = formula + breast + solid;
  if (total === 0) return { total: 0, formulaPct: 0, breastPct: 0, solidPct: 0 };
  const formulaPct = Math.round((formula / total) * 100);
  const breastPct = Math.round((breast / total) * 100);
  return { total, formulaPct, breastPct, solidPct: 100 - formulaPct - breastPct };
}

// 타이머 경과 시간(초). 일시정지 중에는 누적값만 반환한다
export function computeTimerSeconds(
  timer: Pick<RunningTimer, "startedAt" | "isPaused" | "accumulatedSec"> | null,
  nowMs: number
): number {
  if (!timer) return 0;
  if (timer.isPaused) return timer.accumulatedSec;
  return timer.accumulatedSec + Math.max(0, Math.floor((nowMs - timer.startedAt) / 1000));
}

export type DaySlot = "sleep" | "feeding" | "diaper" | null;

// 하루를 30분 단위 48칸으로 나눈 흐름 (수면 구간 위에 수유·기저귀 시점을 덧그린다)
export function buildDaySlots(activities: ActivityRecord[], dayKey: string): DaySlot[] {
  const slots: DaySlot[] = Array.from({ length: 48 }, () => null);
  const dayStart = parseDateKey(dayKey).getTime();
  const slotMs = 30 * 60_000;
  const toSlot = (ms: number) => Math.floor((ms - dayStart) / slotMs);

  for (const act of activities) {
    if (act.category !== "SLEEP") continue;
    const start = new Date(act.startedAt).getTime();
    const end = start + (act.durationSec ?? 0) * 1000;
    const from = Math.max(0, toSlot(start));
    const to = Math.min(47, toSlot(end - 1));
    for (let i = from; i <= to; i += 1) slots[i] = "sleep";
  }

  for (const act of activities) {
    if (act.category !== "FEEDING" && act.category !== "DIAPER") continue;
    const index = toSlot(new Date(act.startedAt).getTime());
    if (index < 0 || index > 47) continue;
    if (act.category === "FEEDING") slots[index] = "feeding";
    else if (slots[index] !== "feeding") slots[index] = "diaper";
  }

  return slots;
}
