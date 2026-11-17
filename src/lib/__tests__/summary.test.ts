import { describe, expect, it } from "vitest";
import type { ActivityRecord } from "@/lib/mock-data";
import {
  computeDailySummary,
  computeFeedingBreakdown,
  computeTimerSeconds,
  findLatestByCategory,
  groupActivitiesByPeriod,
} from "@/lib/summary";

let seq = 0;
function act(partial: Partial<ActivityRecord> & Pick<ActivityRecord, "category" | "startedAt">): ActivityRecord {
  seq += 1;
  return {
    id: `t-${seq}`,
    babyId: "baby",
    recordedBy: "엄마",
    summaryTitle: "",
    details: {},
    ...partial,
  };
}

const DAY = "2026-11-11";
const NOW = new Date("2026-11-11T22:00:00+09:00").getTime();

describe("computeDailySummary", () => {
  it("기록이 없으면 가짜 값 없이 모두 0이다", () => {
    const s = computeDailySummary([], DAY, NOW);
    expect(s.feedingCount).toBe(0);
    expect(s.tummyCount).toBe(0);
    expect(s.tummyMin).toBe(0);
    expect(s.medCount).toBe(0);
    expect(s.pumpMl).toBe(0);
    expect(s.awakeMin).toBe(22 * 60);
  });

  it("선택한 날짜의 기록만 집계한다", () => {
    const s = computeDailySummary(
      [
        act({ category: "FEEDING", startedAt: "2026-11-11T08:00:00+09:00", amountMl: 160, details: { feedingType: "FORMULA" } }),
        act({ category: "FEEDING", startedAt: "2026-11-10T08:00:00+09:00", amountMl: 999, details: { feedingType: "FORMULA" } }),
      ],
      DAY,
      NOW
    );
    expect(s.formulaMl).toBe(160);
    expect(s.bottleCount).toBe(1);
  });

  it("수유 유형과 좌우 시간을 구분한다", () => {
    const s = computeDailySummary(
      [
        act({ category: "FEEDING", startedAt: "2026-11-11T08:00:00+09:00", amountMl: 150, details: { feedingType: "FORMULA" } }),
        act({ category: "FEEDING", startedAt: "2026-11-11T10:00:00+09:00", durationSec: 1320, details: { feedingType: "BREAST", leftDurationSec: 720, rightDurationSec: 600 } }),
        act({ category: "FEEDING", startedAt: "2026-11-11T12:00:00+09:00", durationSec: 600, details: { timerCategory: "FEEDING_LEFT" } }),
        act({ category: "FEEDING", startedAt: "2026-11-11T13:00:00+09:00", amountMl: 80, details: { feedingType: "SOLID_FOOD" } }),
      ],
      DAY,
      NOW
    );
    expect(s.feedingCount).toBe(4);
    expect(s.formulaMl).toBe(150);
    expect(s.breastCount).toBe(2);
    expect(s.breastLeftMin).toBe(22);
    expect(s.breastRightMin).toBe(10);
    expect(s.solidCount).toBe(1);
  });

  it("기저귀·수면·유축·체온을 집계한다", () => {
    const s = computeDailySummary(
      [
        act({ category: "DIAPER", startedAt: "2026-11-11T08:00:00+09:00", details: { diaperType: "WET" } }),
        act({ category: "DIAPER", startedAt: "2026-11-11T09:00:00+09:00", details: { diaperType: "BOTH" } }),
        act({ category: "DIAPER", startedAt: "2026-11-11T10:00:00+09:00", details: { diaperType: "SOLID" } }),
        act({ category: "SLEEP", startedAt: "2026-11-11T13:00:00+09:00", durationSec: 105 * 60 }),
        act({ category: "PUMPING", startedAt: "2026-11-11T14:00:00+09:00", amountMl: 120 }),
        act({ category: "TEMPERATURE", startedAt: "2026-11-11T07:00:00+09:00", valueNum: 37.8 }),
        act({ category: "TEMPERATURE", startedAt: "2026-11-11T15:00:00+09:00", valueNum: 36.7 }),
      ],
      DAY,
      NOW
    );
    expect(s.wetCount).toBe(2);
    expect(s.poopCount).toBe(2);
    expect(s.totalSleepMin).toBe(105);
    expect(s.awakeMin).toBe(22 * 60 - 105);
    expect(s.pumpMl).toBe(120);
    expect(s.lastTemperature).toBe(36.7);
  });

  it("지난 날짜의 깨어 있던 시간은 24시간 기준이다", () => {
    const s = computeDailySummary(
      [act({ category: "SLEEP", startedAt: "2026-11-10T13:00:00+09:00", durationSec: 14 * 3600 })],
      "2026-11-10",
      NOW
    );
    expect(s.awakeMin).toBe(10 * 60);
  });
});

describe("타임라인 그룹핑", () => {
  it("밤 → 오후 → 오전 → 새벽 순서로, 그룹 안에서는 최신순", () => {
    const groups = groupActivitiesByPeriod(
      [
        act({ category: "NOTE", startedAt: "2026-11-11T02:00:00+09:00", summaryTitle: "새벽" }),
        act({ category: "NOTE", startedAt: "2026-11-11T20:00:00+09:00", summaryTitle: "밤1" }),
        act({ category: "NOTE", startedAt: "2026-11-11T21:00:00+09:00", summaryTitle: "밤2" }),
        act({ category: "NOTE", startedAt: "2026-11-11T09:00:00+09:00", summaryTitle: "오전" }),
        act({ category: "NOTE", startedAt: "2026-11-12T09:00:00+09:00", summaryTitle: "다른 날" }),
      ],
      DAY
    );
    expect(groups.map(([label]) => label)).toEqual(["밤", "오전", "새벽"]);
    expect(groups[0][1].map((a) => a.summaryTitle)).toEqual(["밤2", "밤1"]);
  });

  it("카테고리별 최신 기록을 찾는다", () => {
    const list = [
      act({ category: "FEEDING", startedAt: "2026-11-11T08:00:00.000Z", summaryTitle: "old" }),
      act({ category: "FEEDING", startedAt: "2026-11-11T12:00:00.000Z", summaryTitle: "new" }),
      act({ category: "SLEEP", startedAt: "2026-11-11T13:00:00.000Z" }),
    ];
    expect(findLatestByCategory(list, "FEEDING")?.summaryTitle).toBe("new");
    expect(findLatestByCategory(list, "DIAPER")).toBeUndefined();
  });
});

describe("computeFeedingBreakdown", () => {
  it("수유 기록이 없으면 0%", () => {
    expect(computeFeedingBreakdown([])).toEqual({ total: 0, formulaPct: 0, breastPct: 0, solidPct: 0 });
  });

  it("비율의 합은 항상 100이다", () => {
    const list = [
      act({ category: "FEEDING", startedAt: "2026-11-11T08:00:00Z", amountMl: 100 }),
      act({ category: "FEEDING", startedAt: "2026-11-11T09:00:00Z", durationSec: 600 }),
      act({ category: "FEEDING", startedAt: "2026-11-11T10:00:00Z", amountMl: 50, details: { feedingType: "SOLID_FOOD" } }),
    ];
    const b = computeFeedingBreakdown(list);
    expect(b.total).toBe(3);
    expect(b.formulaPct + b.breastPct + b.solidPct).toBe(100);
  });
});

describe("computeTimerSeconds", () => {
  it("진행 중이면 누적 + 경과, 일시정지면 누적만", () => {
    expect(computeTimerSeconds(null, NOW)).toBe(0);
    expect(computeTimerSeconds({ startedAt: NOW - 90_000, isPaused: false, accumulatedSec: 30 }, NOW)).toBe(120);
    expect(computeTimerSeconds({ startedAt: NOW - 90_000, isPaused: true, accumulatedSec: 30 }, NOW)).toBe(30);
  });
});

describe("buildDaySlots", () => {
  it("수면 구간을 채우고 수유·기저귀 시점을 덧그린다", async () => {
    const { buildDaySlots } = await import("@/lib/summary");
    const slots = buildDaySlots(
      [
        // 전날 23:00부터 2시간 수면 → 당일 00:00~01:00 두 칸
        act({ category: "SLEEP", startedAt: "2026-11-10T23:00:00+09:00", durationSec: 7200 }),
        act({ category: "FEEDING", startedAt: "2026-11-11T00:40:00+09:00" }),
        act({ category: "DIAPER", startedAt: "2026-11-11T12:10:00+09:00" }),
        act({ category: "DIAPER", startedAt: "2026-11-12T12:10:00+09:00" }),
      ],
      DAY
    );
    expect(slots).toHaveLength(48);
    expect(slots[0]).toBe("sleep");
    expect(slots[1]).toBe("feeding");
    expect(slots[2]).toBeNull();
    expect(slots[24]).toBe("diaper");
    expect(slots.filter(Boolean)).toHaveLength(3);
  });
});
