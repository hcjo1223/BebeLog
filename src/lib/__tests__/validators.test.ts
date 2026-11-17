import { describe, expect, it } from "vitest";
import { CreateActivityLogSchema } from "@/lib/validators/activity";
import { parseDiarySummary } from "@/lib/validators/diary";
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, validateMediaFile } from "@/lib/storage";
import { mapActiveTimer } from "@/lib/timers";

describe("CreateActivityLogSchema", () => {
  const base = {
    babyId: "11111111-1111-4111-8111-111111111111",
    category: "FEEDING",
    startedAt: "2026-11-11T08:30:00.000Z",
  };

  it("최소 필드만으로 통과하고 details 기본값은 빈 객체", () => {
    const parsed = CreateActivityLogSchema.parse(base);
    expect(parsed.details).toEqual({});
  });

  it("잘못된 카테고리와 500자 초과 메모를 거부한다", () => {
    expect(CreateActivityLogSchema.safeParse({ ...base, category: "PLAY" }).success).toBe(false);
    expect(CreateActivityLogSchema.safeParse({ ...base, note: "가".repeat(501) }).success).toBe(false);
  });
});

describe("parseDiarySummary", () => {
  it("올바른 스냅샷은 그대로, 깨진 값은 0으로", () => {
    const ok = { totalFeedingMl: 780, totalSleepHours: 13.5, diaperCount: 8 };
    expect(parseDiarySummary(ok)).toEqual(ok);
    expect(parseDiarySummary(null)).toEqual({ totalFeedingMl: 0, totalSleepHours: 0, diaperCount: 0 });
    expect(parseDiarySummary({ totalFeedingMl: "많이" }).diaperCount).toBe(0);
  });
});

describe("validateMediaFile", () => {
  it("허용 형식과 확장자를 돌려준다", () => {
    expect(validateMediaFile("image/jpeg", 1024)).toEqual({ ok: true, ext: "jpg", kind: "IMAGE" });
    expect(validateMediaFile("video/mp4", 1024)).toEqual({ ok: true, ext: "mp4", kind: "VIDEO" });
  });

  it("허용하지 않는 형식, 빈 파일, 용량 초과를 거부한다", () => {
    expect(validateMediaFile("application/pdf", 1024).ok).toBe(false);
    expect(validateMediaFile("image/svg+xml", 1024).ok).toBe(false);
    expect(validateMediaFile("image/png", 0).ok).toBe(false);
    expect(validateMediaFile("image/png", MAX_IMAGE_BYTES + 1).ok).toBe(false);
    expect(validateMediaFile("video/mp4", MAX_IMAGE_BYTES + 1).ok).toBe(true);
    expect(validateMediaFile("video/mp4", MAX_VIDEO_BYTES + 1).ok).toBe(false);
  });
});

describe("mapActiveTimer", () => {
  it("DB 타이머를 화면용 타이머로 변환한다", () => {
    const startedAt = new Date("2026-11-11T08:30:00.000Z");
    const mapped = mapActiveTimer(
      { id: "t1", category: "SLEEP", startedAt, status: "PAUSED", accumulatedSec: 90, note: null, starter: null },
      "아빠"
    );
    expect(mapped).toEqual({
      id: "t1",
      category: "SLEEP",
      label: "SLEEP",
      startedAt: startedAt.getTime(),
      startedBy: "아빠",
      isPaused: true,
      accumulatedSec: 90,
    });
  });
});
