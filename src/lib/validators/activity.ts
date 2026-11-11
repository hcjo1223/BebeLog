import { z } from "zod";

// ============================================================================
// Baby Buddy 오픈소스 모델 구조를 반영한 ActivityLog(JSONB) 상세 검증 스키마
// ============================================================================

// 1. 수유 (FEEDING) 세부 스키마
export const FeedingDetailsSchema = z.object({
  feedingType: z.enum(["BREAST", "FORMULA", "PUMPED_MILK", "SOLID_FOOD"]),
  breastSide: z.enum(["LEFT", "RIGHT", "BOTH"]).optional(),
  leftDurationSec: z.number().int().min(0).optional(),
  rightDurationSec: z.number().int().min(0).optional(),
  solidFoodMenu: z.string().optional(), // 이유식 메뉴명 (예: "소고기브로콜리미음")
  allergyReaction: z.boolean().optional(), // 알레르기 반응 여부
});

// 2. 수면 (SLEEP) 세부 스키마
export const SleepDetailsSchema = z.object({
  sleepType: z.enum(["NAP", "NIGHT"]), // 낮잠 / 밤잠
  wakeCount: z.number().int().min(0).optional(), // 중간에 깬 횟수
  sleepQuality: z.enum(["GOOD", "NORMAL", "RESTLESS"]).optional(),
});

// 3. 배변/기저귀 (DIAPER) 세부 스키마 (Baby Buddy DiaperChange 모델 대응)
export const DiaperDetailsSchema = z.object({
  diaperType: z.enum(["WET", "SOLID", "BOTH"]), // 소변 / 대변 / 혼합
  stoolColor: z.enum(["YELLOW", "BROWN", "GREEN", "BLACK", "RED"]).optional(),
  stoolConsistency: z.enum(["SOFT", "WATERY", "PASTY", "HARD"]).optional(),
  amountLevel: z.enum(["LITTLE", "NORMAL", "HEAVY"]).optional(),
});

// 4. 유축 (PUMPING) 세부 스키마
export const PumpingDetailsSchema = z.object({
  leftAmountMl: z.number().min(0).optional(),
  rightAmountMl: z.number().min(0).optional(),
});

// 5. 투약 (MEDICATION) 세부 스키마
export const MedicationDetailsSchema = z.object({
  medicineName: z.string().min(1, "약 이름을 입력해주세요."), // 예: "챔프 시럽(아세트아미노펜)"
  ingredientType: z.enum(["ACETAMINOPHEN", "IBUPROFEN", "DEXIBUPROFEN", "OTHER"]).optional(), // 해열제 교차복용 체크용
  dosageMl: z.number().positive(),
});

// 통합 육아 기록 생성 요청 스키마
export const CreateActivityLogSchema = z.object({
  babyId: z.string().uuid(),
  category: z.enum([
    "FEEDING",
    "SLEEP",
    "DIAPER",
    "PUMPING",
    "TEMPERATURE",
    "MEDICATION",
    "BATH",
    "TUMMY_TIME",
    "NOTE",
  ]),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  durationSec: z.number().int().min(0).optional(),
  amountMl: z.number().min(0).optional(),
  valueNum: z.number().optional(),
  details: z.record(z.unknown()).default({}),
  note: z.string().max(500).optional(),
});

export type CreateActivityLogInput = z.infer<typeof CreateActivityLogSchema>;
