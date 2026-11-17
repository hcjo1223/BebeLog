import { describe, expect, it } from "vitest";
import {
  addDaysToKey,
  buildMonthGrid,
  calculateAgeInfo,
  formatBubbleDuration,
  formatDurationKo,
  formatElapsedKo,
  formatKoreanDate,
  formatKoreanTime,
  formatTimerSec,
  getTimePeriodLabel,
  toDateKey,
} from "@/lib/format";

const at = (iso: string) => new Date(iso).getTime();

describe("calculateAgeInfo", () => {
  it("출생 당일을 생후 1일로 센다", () => {
    const info = calculateAgeInfo("2026-08-05", undefined, at("2026-08-05T12:00:00Z"));
    expect(info.diffDays).toBe(1);
    expect(info.correctedDays).toBeNull();
  });

  it("주수와 교정일수를 계산한다", () => {
    const info = calculateAgeInfo("2026-08-05", "2026-08-10", at("2026-11-11T12:00:00Z"));
    expect(info.diffDays).toBe(99);
    expect(info.weeks).toBe(14);
    expect(info.correctedDays).toBe(94);
  });
});

describe("경과 시간 포맷", () => {
  const now = at("2026-11-11T22:00:00+09:00");

  it("버블은 H:MM, 기록이 없으면 null", () => {
    expect(formatBubbleDuration("2026-11-11T19:29:00+09:00", now)).toBe("2:31");
    expect(formatBubbleDuration(undefined, now)).toBeNull();
  });

  it("한국어 경과 시간", () => {
    expect(formatElapsedKo("2026-11-11T21:59:40+09:00", now)).toBe("방금 전");
    expect(formatElapsedKo("2026-11-11T21:15:00+09:00", now)).toBe("45분 전");
    expect(formatElapsedKo("2026-11-11T19:29:00+09:00", now)).toBe("2시간 31분 전");
    expect(formatElapsedKo("2026-11-11T20:00:00+09:00", now)).toBe("2시간 전");
    expect(formatElapsedKo("2026-11-09T20:00:00+09:00", now)).toBe("2일 전");
  });

  it("분/초 포맷", () => {
    expect(formatDurationKo(45)).toBe("45분");
    expect(formatDurationKo(60)).toBe("1시간");
    expect(formatDurationKo(105)).toBe("1시간 45분");
    expect(formatTimerSec(65)).toBe("01:05");
    expect(formatTimerSec(3725)).toBe("01:02:05");
  });
});

describe("날짜 유틸 (TZ=Asia/Seoul)", () => {
  it("로컬 시간대 기준으로 날짜 키를 만든다", () => {
    // UTC로는 11월 10일이지만 한국 시간으로는 11월 11일 새벽
    expect(toDateKey("2026-11-10T16:30:00Z")).toBe("2026-11-11");
  });

  it("날짜 이동과 한국어 표기", () => {
    expect(addDaysToKey("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDaysToKey("2026-03-01", -1)).toBe("2026-02-28");
    expect(formatKoreanDate("2026-11-11")).toBe("2026년 11월 11일 (수)");
  });

  it("시각과 시간대 라벨", () => {
    expect(formatKoreanTime("2026-11-11T20:35:00+09:00")).toBe("오후 8:35");
    expect(formatKoreanTime("2026-11-11T00:05:00+09:00")).toBe("오전 12:05");
    expect(getTimePeriodLabel("2026-11-11T03:00:00+09:00")).toBe("새벽");
    expect(getTimePeriodLabel("2026-11-11T09:00:00+09:00")).toBe("오전");
    expect(getTimePeriodLabel("2026-11-11T15:00:00+09:00")).toBe("오후");
    expect(getTimePeriodLabel("2026-11-11T21:00:00+09:00")).toBe("밤");
  });

  it("월간 그리드는 첫 요일만큼 비우고 7의 배수로 채운다", () => {
    const grid = buildMonthGrid(2026, 10); // 2026년 11월 1일은 일요일
    expect(grid[0]).toBe(1);
    expect(grid.filter((c) => c !== null)).toHaveLength(30);
    expect(grid.length % 7).toBe(0);

    const dec = buildMonthGrid(2026, 11); // 12월 1일은 화요일
    expect(dec.slice(0, 3)).toEqual([null, null, 1]);
  });
});
