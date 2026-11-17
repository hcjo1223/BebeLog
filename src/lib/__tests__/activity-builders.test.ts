import { describe, expect, it } from "vitest";
import {
  DEFAULT_QUICK_FORM,
  buildQuickActivity,
  buildTimerActivity,
  describeTemperature,
  isLocalId,
  newLocalId,
  type QuickActivityForm,
} from "@/lib/activity-builders";
import { CreateActivityLogSchema } from "@/lib/validators/activity";

const NOW = new Date("2026-11-11T22:00:00+09:00").getTime();
const ctx = { id: "local-1", babyId: "11111111-1111-4111-8111-111111111111", caregiver: "엄마", nowMs: NOW };
const form = (patch: Partial<QuickActivityForm> & Pick<QuickActivityForm, "category">): QuickActivityForm => ({
  ...DEFAULT_QUICK_FORM,
  ...patch,
});

describe("buildQuickActivity", () => {
  it("분유 수유는 양(ml)을 기록한다", () => {
    const rec = buildQuickActivity(form({ category: "FEEDING", formulaMl: 140 }), ctx);
    expect(rec.summaryTitle).toBe("분유 수유 140ml");
    expect(rec.amountMl).toBe(140);
    expect(rec.details).toEqual({ feedingType: "FORMULA" });
    expect(rec.startedAt).toBe(new Date(NOW).toISOString());
    expect(rec.endedAt).toBeUndefined();
  });

  it("모유 수유는 끝난 시각 기준으로 시작 시각을 역산한다", () => {
    const rec = buildQuickActivity(
      form({ category: "FEEDING", feedingType: "BREAST", breastSide: "RIGHT", breastMinutes: 20 }),
      ctx
    );
    expect(rec.durationSec).toBe(1200);
    expect(rec.endedAt).toBe(new Date(NOW).toISOString());
    expect(rec.startedAt).toBe(new Date(NOW - 1200_000).toISOString());
    expect(rec.subDetail).toBe("오른쪽");
  });

  it("'몇 분 전' 선택과 메모를 반영한다", () => {
    const rec = buildQuickActivity(
      form({ category: "DIAPER", diaperType: "SOLID", stoolColor: "GREEN", minutesAgo: 15, note: " 양 많음 " }),
      ctx
    );
    expect(rec.startedAt).toBe(new Date(NOW - 15 * 60_000).toISOString());
    expect(rec.summaryTitle).toBe("대변 기저귀");
    expect(rec.subDetail).toBe("녹변 · 양 많음");
    expect(rec.note).toBe("양 많음");
    expect(rec.details).toEqual({ diaperType: "SOLID", stoolColor: "GREEN" });
  });

  it("소변 기저귀에는 변 색상을 남기지 않는다", () => {
    const rec = buildQuickActivity(form({ category: "DIAPER", diaperType: "WET", stoolColor: "GREEN" }), ctx);
    expect(rec.details).toEqual({ diaperType: "WET" });
    expect(rec.subDetail).toBeUndefined();
  });

  it("체온은 수치와 판정 문구를 남긴다", () => {
    const rec = buildQuickActivity(form({ category: "TEMPERATURE", temperature: 38.2 }), ctx);
    expect(rec.valueNum).toBe(38.2);
    expect(rec.summaryTitle).toBe("체온 38.2°C");
    expect(describeTemperature(36.9)).toBe("정상 체온");
    expect(describeTemperature(37.5)).toContain("미열");
    expect(describeTemperature(38)).toContain("발열");
  });

  it("모든 카테고리의 결과가 서버 검증 스키마를 통과한다", () => {
    const categories = ["FEEDING", "SLEEP", "DIAPER", "PUMPING", "TEMPERATURE", "MEDICATION", "BATH", "TUMMY_TIME", "NOTE"] as const;
    for (const category of categories) {
      const rec = buildQuickActivity(form({ category }), ctx);
      const parsed = CreateActivityLogSchema.safeParse({
        babyId: rec.babyId,
        category: rec.category,
        startedAt: rec.startedAt,
        endedAt: rec.endedAt,
        durationSec: rec.durationSec,
        amountMl: rec.amountMl,
        valueNum: rec.valueNum,
        details: rec.details,
        note: rec.note,
      });
      expect(parsed.success, category).toBe(true);
      expect(rec.summaryTitle.length, category).toBeGreaterThan(0);
    }
  });
});

describe("buildTimerActivity", () => {
  it("타이머 시작 시각부터 종료 시각까지를 기록한다", () => {
    const rec = buildTimerActivity({ category: "FEEDING_LEFT" }, 754, ctx);
    expect(rec.category).toBe("FEEDING");
    expect(rec.durationSec).toBe(754);
    expect(rec.startedAt).toBe(new Date(NOW - 754_000).toISOString());
    expect(rec.endedAt).toBe(new Date(NOW).toISOString());
    expect(rec.details).toMatchObject({ feedingType: "BREAST", breastSide: "LEFT" });
  });

  it("1분 미만은 1분으로 올린다", () => {
    const rec = buildTimerActivity({ category: "SLEEP" }, 12, ctx);
    expect(rec.durationSec).toBe(60);
    expect(rec.summaryTitle).toBe("수면 1분");
  });
});

describe("로컬 ID", () => {
  it("서버 UUID와 구분된다", () => {
    const id = newLocalId(NOW);
    expect(isLocalId(id)).toBe(true);
    expect(newLocalId(NOW)).not.toBe(id);
    expect(isLocalId("11111111-1111-4111-8111-111111111111")).toBe(false);
  });
});
