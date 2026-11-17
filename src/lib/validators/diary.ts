import { z } from "zod";

export const DiarySummarySchema = z.object({
  totalFeedingMl: z.number().min(0),
  totalSleepHours: z.number().min(0),
  diaperCount: z.number().int().min(0),
});

export type DiarySummary = z.infer<typeof DiarySummarySchema>;

const EMPTY_SUMMARY: DiarySummary = {
  totalFeedingMl: 0,
  totalSleepHours: 0,
  diaperCount: 0,
};

// DB의 JSONB 스냅샷을 안전하게 읽는다. 형식이 맞지 않으면 0으로 채운다
export function parseDiarySummary(value: unknown): DiarySummary {
  const parsed = DiarySummarySchema.safeParse(value);
  return parsed.success ? parsed.data : { ...EMPTY_SUMMARY };
}
