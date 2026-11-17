// ============================================================================
// 육아 트래커 및 육아일기 모바일 웹 도메인 타입 및 초기 샘플 데이터
// ============================================================================

export type ActivityCategory =
  | "FEEDING"
  | "SLEEP"
  | "DIAPER"
  | "PUMPING"
  | "TEMPERATURE"
  | "MEDICATION"
  | "BATH"
  | "TUMMY_TIME"
  | "NOTE";

export interface BabyProfile {
  id: string;
  name: string;
  nickname: string;
  birthDate: string; // YYYY-MM-DD
  dueDate?: string;
  gender: "M" | "F";
  bloodType: string;
  weightKg: number;
  heightCm: number;
  headCm: number;
}

export interface ActivityRecord {
  id: string;
  babyId: string;
  category: ActivityCategory;
  startedAt: string; // ISO string
  endedAt?: string;
  durationSec?: number;
  amountMl?: number;
  valueNum?: number; // 체온 등
  recordedBy: string; // "엄마" | "아빠" | "할머니"
  summaryTitle: string;
  subDetail?: string;
  note?: string;
  details: Record<string, unknown>;
}

export interface RunningTimer {
  id: string;
  category: "FEEDING_LEFT" | "FEEDING_RIGHT" | "SLEEP" | "PUMPING" | "TUMMY_TIME";
  label: string;
  startedAt: number; // timestamp (ms)
  startedBy: string;
  isPaused: boolean;
  accumulatedSec: number;
}

export interface DiaryPhoto {
  id: string;
  url: string;
  type: "IMAGE" | "VIDEO";
}

export interface DiaryItem {
  id: string;
  babyId: string;
  diaryDate: string;
  title: string;
  content: string;
  mood: string;
  author: string;
  tags: string[];
  isMilestone: boolean;
  photos: DiaryPhoto[];
  dailySummary: {
    totalFeedingMl: number;
    totalSleepHours: number;
    diaperCount: number;
  };
}

export interface GrowthItem {
  id: string;
  date: string;
  ageDays: number;
  weightKg: number;
  heightCm: number;
  headCm: number;
  note?: string;
}

// 다둥이 전환 테스트를 위한 샘플 아이 프로필 목록
export const INITIAL_BABIES: BabyProfile[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "김하준",
    nickname: "튼튼이",
    birthDate: "2026-08-05",
    dueDate: "2026-08-10",
    gender: "M",
    bloodType: "A+",
    weightKg: 6.4,
    heightCm: 62.5,
    headCm: 40.8,
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "김하윤",
    nickname: "반짝이",
    birthDate: "2024-11-20",
    gender: "F",
    bloodType: "O+",
    weightKg: 11.8,
    heightCm: 85.2,
    headCm: 47.5,
  },
];

// SSR과 클라이언트(아이폰 Safari 등) 간 Hydration 불일치를 원천 방지하기 위해
// 기준 시각을 고정된 ISO 타임스탬프(2026-11-11 22:00 KST)로 설정합니다.
export const BASE_NOW_MS = new Date("2026-11-11T22:00:00+09:00").getTime();
const hoursAgo = (h: number, m = 0) =>
  new Date(BASE_NOW_MS - (h * 60 + m) * 60 * 1000).toISOString();

export const INITIAL_ACTIVITIES: ActivityRecord[] = [
  {
    id: "act-1",
    babyId: "11111111-1111-1111-1111-111111111111",
    category: "FEEDING",
    startedAt: hoursAgo(1, 25),
    amountMl: 160,
    recordedBy: "엄마",
    summaryTitle: "분유 수유 160ml",
    subDetail: "트름 완료 · 남김 없이 다 먹음",
    details: { feedingType: "FORMULA" },
  },
  {
    id: "act-2",
    babyId: "11111111-1111-1111-1111-111111111111",
    category: "DIAPER",
    startedAt: hoursAgo(2, 10),
    recordedBy: "아빠",
    summaryTitle: "대소변 기저귀 교체",
    subDetail: "황금변 · 무르기 보통 · 양 많음",
    details: { diaperType: "BOTH", stoolColor: "YELLOW", stoolConsistency: "SOFT" },
  },
  {
    id: "act-3",
    babyId: "11111111-1111-1111-1111-111111111111",
    category: "SLEEP",
    startedAt: hoursAgo(4, 15),
    endedAt: hoursAgo(2, 30),
    durationSec: 105 * 60,
    recordedBy: "엄마",
    summaryTitle: "낮잠 1시간 45분",
    subDetail: "깨지 않고 푹 잠 (수면 품질 좋음)",
    details: { sleepType: "NAP", sleepQuality: "GOOD" },
  },
  {
    id: "act-4",
    babyId: "11111111-1111-1111-1111-111111111111",
    category: "TEMPERATURE",
    startedAt: hoursAgo(5, 0),
    valueNum: 36.7,
    recordedBy: "엄마",
    summaryTitle: "체온 36.7°C (정상)",
    subDetail: "귀 체온계 측정",
    details: {},
  },
  {
    id: "act-5",
    babyId: "11111111-1111-1111-1111-111111111111",
    category: "FEEDING",
    startedAt: hoursAgo(5, 30),
    durationSec: 22 * 60,
    recordedBy: "엄마",
    summaryTitle: "모유 수유 22분 (좌 12분 / 우 10분)",
    subDetail: "수유 후 바로 기분 좋게 놀았음",
    details: { feedingType: "BREAST", leftDurationSec: 720, rightDurationSec: 600 },
  },
  {
    id: "act-6",
    babyId: "11111111-1111-1111-1111-111111111111",
    category: "DIAPER",
    startedAt: hoursAgo(6, 5),
    recordedBy: "아빠",
    summaryTitle: "소변 기저귀 교체",
    subDetail: "소변량 보통",
    details: { diaperType: "WET" },
  },
  {
    id: "act-7",
    babyId: "11111111-1111-1111-1111-111111111111",
    category: "FEEDING",
    startedAt: hoursAgo(8, 45),
    amountMl: 150,
    recordedBy: "아빠",
    summaryTitle: "분유 수유 150ml",
    subDetail: "새벽/아침 첫 수유",
    details: { feedingType: "FORMULA" },
  },
];

export const INITIAL_DIARIES: DiaryItem[] = [
  {
    id: "diary-1",
    babyId: "11111111-1111-1111-1111-111111111111",
    diaryDate: "2026-11-10",
    title: "스스로 뒤집기에 처음 성공한 날! 🎉",
    content:
      "아침 터미타임 하려고 매트에 눕혀놨더니 갑자기 끙차 소리를 내면서 혼자 힘으로 완벽하게 뒤집었다! 팔까지 쏙 빼고 고개를 번쩍 드는데 엄마 아빠 둘 다 소리 지르며 박수 쳤다. 우리 하준이 정말 하루가 다르게 크는구나.",
    mood: "🥰",
    author: "엄마",
    tags: ["첫뒤집기", "생후97일", "폭풍성장"],
    isMilestone: true,
    photos: [],
    dailySummary: {
      totalFeedingMl: 780,
      totalSleepHours: 13.5,
      diaperCount: 8,
    },
  },
  {
    id: "diary-2",
    babyId: "11111111-1111-1111-1111-111111111111",
    diaryDate: "2026-11-08",
    title: "목욕하고 로션 바르며 까르르 웃음 터진 밤",
    content:
      "아빠가 목욕 시켜줄 때 물장구를 어찌나 치던지 욕실 바닥이 다 젖었다. 로션 발라주면서 배에 바람 불어주니 처음으로 소리 내서 까르르 웃어주었다. 그 웃음소리에 하루 피로가 싹 녹아내린다.",
    mood: "😊",
    author: "아빠",
    tags: ["목욕시간", "아빠랑교감", "배넷웃음"],
    isMilestone: false,
    photos: [],
    dailySummary: {
      totalFeedingMl: 810,
      totalSleepHours: 14.2,
      diaperCount: 9,
    },
  },
];

export const INITIAL_GROWTH_RECORDS: GrowthItem[] = [
  { id: "g-1", date: "2026-08-05", ageDays: 0, weightKg: 3.2, heightCm: 50.1, headCm: 34.0, note: "출생 시 기록" },
  { id: "g-2", date: "2026-09-05", ageDays: 31, weightKg: 4.3, heightCm: 54.2, headCm: 36.8, note: "BCG 접종일 측정" },
  { id: "g-3", date: "2026-10-05", ageDays: 61, weightKg: 5.5, heightCm: 58.6, headCm: 39.1, note: "2개월 영유아 검진" },
  { id: "g-4", date: "2026-11-05", ageDays: 92, weightKg: 6.4, heightCm: 62.5, headCm: 40.8, note: "상위 68% 건강하게 성장 중" },
];
