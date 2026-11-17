// ============================================================================
// 날짜·시간 표시용 순수 유틸리티 (서버/클라이언트 공용, 테스트 대상)
// ============================================================================

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

// 생후 일수(D+Day), 주수, 개월 수 및 교정일수 계산
export function calculateAgeInfo(
  birthDateStr: string,
  dueDateStr: string | undefined,
  nowMs: number
) {
  const birth = new Date(birthDateStr).getTime();
  const diffDays = Math.max(1, Math.floor((nowMs - birth) / DAY_MS) + 1);
  const weeks = Math.floor(diffDays / 7);
  const months = Math.floor(diffDays / 30);
  const remainDays = diffDays % 30;

  let correctedDays: number | null = null;
  if (dueDateStr) {
    const due = new Date(dueDateStr).getTime();
    correctedDays = Math.floor((nowMs - due) / DAY_MS) + 1;
  }

  return { diffDays, weeks, months, remainDays, correctedDays };
}

// 원형 타일 상단 상태 버블용 H:MM 포맷 ("2:31"). 기록이 없으면 null
export function formatBubbleDuration(
  isoDate: string | undefined,
  nowMs: number
): string | null {
  if (!isoDate) return null;
  const diffMin = Math.max(
    0,
    Math.floor((nowMs - new Date(isoDate).getTime()) / 60000)
  );
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

// 한국어 경과 시간 ("2시간 31분 전")
export function formatElapsedKo(isoDate: string, nowMs: number): string {
  const diffMin = Math.floor((nowMs - new Date(isoDate).getTime()) / 60000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  if (h >= 24) return `${Math.floor(h / 24)}일 전`;
  return m > 0 ? `${h}시간 ${m}분 전` : `${h}시간 전`;
}

// 분 단위를 "1시간 20분" 형태로 변환
export function formatDurationKo(totalMin: number): string {
  const safe = Math.max(0, Math.round(totalMin));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  if (h === 0) return `${m}분`;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

// 초 단위를 MM:SS 또는 HH:MM:SS로 변환
export function formatTimerSec(totalSec: number): string {
  const safe = Math.max(0, Math.floor(totalSec));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hrs > 0
    ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}`
    : `${pad(mins)}:${pad(secs)}`;
}

export type TimePeriod = "새벽" | "오전" | "오후" | "밤";

// 시간대 분류: 새벽(0~6시) / 오전(6~12시) / 오후(12~19시) / 밤(19~24시)
export function getTimePeriodLabel(isoDate: string): TimePeriod {
  const hour = new Date(isoDate).getHours();
  if (hour < 6) return "새벽";
  if (hour < 12) return "오전";
  if (hour < 19) return "오후";
  return "밤";
}

// SSR과 iOS Safari 간 toLocaleTimeString 불일치로 인한 Hydration Error를
// 방지하기 위한 결정론적 한국어 시각 포맷터 ("오후 8:35")
export function formatKoreanTime(isoDate: string): string {
  const d = new Date(isoDate);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const period = h < 12 ? "오전" : "오후";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${hour12}:${m}`;
}

// 기기 로컬 시간대 기준 날짜 키 ("2026-11-11")
export function toDateKey(input: Date | number | string): string {
  const d = input instanceof Date ? input : new Date(input);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// 날짜 키를 로컬 자정 Date로 변환
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDaysToKey(key: string, days: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

// "2026년 11월 11일 (수)"
export function formatKoreanDate(key: string): string {
  const d = parseDateKey(key);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${
    WEEKDAYS_KO[d.getDay()]
  })`;
}

// 월간 캘린더 그리드: 앞쪽 빈 칸은 null, 이후 1..말일
export function buildMonthGrid(year: number, monthIndex: number): (number | null)[] {
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: (number | null)[] = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
