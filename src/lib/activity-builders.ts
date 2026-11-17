// ============================================================================
// 입력 폼/타이머 → ActivityRecord 변환 (순수 함수, 테스트 대상)
// ============================================================================
import type { ActivityCategory, ActivityRecord, RunningTimer } from "@/lib/mock-data";
import { formatDurationKo } from "@/lib/format";

// 서버에 아직 저장되지 않은 로컬 기록의 ID 접두사
export const LOCAL_ID_PREFIX = "local-";
export const isLocalId = (id: string) => id.startsWith(LOCAL_ID_PREFIX);

let localSeq = 0;
export function newLocalId(nowMs: number = Date.now()): string {
  localSeq += 1;
  return `${LOCAL_ID_PREFIX}${nowMs}-${localSeq}`;
}

export type FeedingType = "FORMULA" | "BREAST" | "SOLID_FOOD";
export type BreastSide = "LEFT" | "RIGHT" | "BOTH";
export type DiaperType = "WET" | "SOLID" | "BOTH";
export type StoolColor = "YELLOW" | "BROWN" | "GREEN";

export interface QuickActivityForm {
  category: ActivityCategory;
  feedingType: FeedingType;
  formulaMl: number;
  solidG: number;
  breastSide: BreastSide;
  breastMinutes: number;
  diaperType: DiaperType;
  stoolColor: StoolColor;
  sleepMinutes: number;
  temperature: number;
  medicineName: string;
  pumpMl: number;
  tummyMinutes: number;
  // 몇 분 전에 일어난 일인지 (늦게 기록하는 경우)
  minutesAgo: number;
  note: string;
}

export const DEFAULT_QUICK_FORM: Omit<QuickActivityForm, "category"> = {
  feedingType: "FORMULA",
  formulaMl: 160,
  solidG: 80,
  breastSide: "LEFT",
  breastMinutes: 15,
  diaperType: "WET",
  stoolColor: "YELLOW",
  sleepMinutes: 60,
  temperature: 36.5,
  medicineName: "",
  pumpMl: 100,
  tummyMinutes: 5,
  minutesAgo: 0,
  note: "",
};

export interface BuildContext {
  id: string;
  babyId: string;
  caregiver: string;
  nowMs: number;
}

const SIDE_LABEL: Record<BreastSide, string> = {
  LEFT: "왼쪽",
  RIGHT: "오른쪽",
  BOTH: "양쪽",
};

const STOOL_LABEL: Record<StoolColor, string> = {
  YELLOW: "황금변",
  BROWN: "갈색변",
  GREEN: "녹변",
};

export function describeTemperature(value: number): string {
  if (value >= 38) return "발열 · 해열 및 진료 상담 필요";
  if (value >= 37.5) return "미열 · 경과 관찰";
  return "정상 체온";
}

const joinDetail = (...parts: (string | undefined)[]) => {
  const text = parts.filter(Boolean).join(" · ");
  return text || undefined;
};

export function buildQuickActivity(form: QuickActivityForm, ctx: BuildContext): ActivityRecord {
  const note = form.note.trim() || undefined;
  const eventAt = ctx.nowMs - Math.max(0, form.minutesAgo) * 60_000;

  let summaryTitle = "";
  let autoDetail: string | undefined;
  let amountMl: number | undefined;
  let durationSec: number | undefined;
  let valueNum: number | undefined;
  let details: Record<string, unknown> = {};

  switch (form.category) {
    case "FEEDING":
      if (form.feedingType === "FORMULA") {
        amountMl = form.formulaMl;
        summaryTitle = `분유 수유 ${form.formulaMl}ml`;
        details = { feedingType: "FORMULA" };
      } else if (form.feedingType === "BREAST") {
        durationSec = form.breastMinutes * 60;
        summaryTitle = `모유 수유 ${form.breastMinutes}분`;
        autoDetail = SIDE_LABEL[form.breastSide];
        details = { feedingType: "BREAST", breastSide: form.breastSide };
      } else {
        amountMl = form.solidG;
        summaryTitle = `이유식 ${form.solidG}g`;
        details = { feedingType: "SOLID_FOOD" };
      }
      break;
    case "DIAPER":
      summaryTitle =
        form.diaperType === "WET" ? "소변 기저귀" : form.diaperType === "SOLID" ? "대변 기저귀" : "대소변 기저귀";
      if (form.diaperType === "WET") {
        details = { diaperType: "WET" };
      } else {
        autoDetail = STOOL_LABEL[form.stoolColor];
        details = { diaperType: form.diaperType, stoolColor: form.stoolColor };
      }
      break;
    case "SLEEP":
      durationSec = form.sleepMinutes * 60;
      summaryTitle = `수면 ${formatDurationKo(form.sleepMinutes)}`;
      break;
    case "TEMPERATURE":
      valueNum = form.temperature;
      summaryTitle = `체온 ${form.temperature.toFixed(1)}°C`;
      autoDetail = describeTemperature(form.temperature);
      break;
    case "MEDICATION": {
      const name = form.medicineName.trim();
      summaryTitle = name ? `투약 · ${name}` : "투약";
      details = name ? { medicineName: name } : {};
      break;
    }
    case "BATH":
      summaryTitle = "목욕";
      break;
    case "PUMPING":
      amountMl = form.pumpMl;
      summaryTitle = `유축 ${form.pumpMl}ml`;
      break;
    case "TUMMY_TIME":
      durationSec = form.tummyMinutes * 60;
      summaryTitle = `터미타임 ${form.tummyMinutes}분`;
      break;
    default:
      summaryTitle = "육아 메모";
      break;
  }

  // 지속 시간이 있는 기록은 "끝난 시각"을 기준으로 시작 시각을 역산한다
  const startedAtMs = durationSec ? eventAt - durationSec * 1000 : eventAt;

  return {
    id: ctx.id,
    babyId: ctx.babyId,
    category: form.category,
    startedAt: new Date(startedAtMs).toISOString(),
    endedAt: durationSec ? new Date(eventAt).toISOString() : undefined,
    amountMl,
    durationSec,
    valueNum,
    recordedBy: ctx.caregiver,
    summaryTitle,
    subDetail: joinDetail(autoDetail, note),
    note,
    details,
  };
}

// 실시간 타이머 종료 시 타임라인 기록으로 변환
export function buildTimerActivity(
  timer: Pick<RunningTimer, "category">,
  totalSec: number,
  ctx: BuildContext
): ActivityRecord {
  const durationSec = Math.max(60, Math.round(totalSec));
  const mins = Math.max(1, Math.round(durationSec / 60));

  let category: ActivityCategory;
  let summaryTitle: string;
  let subDetail: string | undefined;
  const details: Record<string, unknown> = { timerCategory: timer.category };

  switch (timer.category) {
    case "FEEDING_LEFT":
      category = "FEEDING";
      summaryTitle = `모유 수유 ${mins}분`;
      subDetail = "왼쪽";
      details.feedingType = "BREAST";
      details.breastSide = "LEFT";
      break;
    case "FEEDING_RIGHT":
      category = "FEEDING";
      summaryTitle = `모유 수유 ${mins}분`;
      subDetail = "오른쪽";
      details.feedingType = "BREAST";
      details.breastSide = "RIGHT";
      break;
    case "SLEEP":
      category = "SLEEP";
      summaryTitle = `수면 ${formatDurationKo(mins)}`;
      break;
    case "PUMPING":
      category = "PUMPING";
      summaryTitle = `유축 ${mins}분`;
      break;
    default:
      category = "TUMMY_TIME";
      summaryTitle = `터미타임 ${mins}분`;
      break;
  }

  return {
    id: ctx.id,
    babyId: ctx.babyId,
    category,
    startedAt: new Date(ctx.nowMs - durationSec * 1000).toISOString(),
    endedAt: new Date(ctx.nowMs).toISOString(),
    durationSec,
    recordedBy: ctx.caregiver,
    summaryTitle,
    subDetail: joinDetail(subDetail, "타이머 기록"),
    details,
  };
}
