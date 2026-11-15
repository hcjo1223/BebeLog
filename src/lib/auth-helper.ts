import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import type { ActivityRecord, ActivityCategory } from "@/lib/mock-data";

// 현재 로그인한 DB 사용자 ID 조회 (JWT에 userId가 누락된 경우 email로 보정)
export async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.email) return null;

  if (session.user.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (dbUser) return dbUser;
  }

  return prisma.user.findUnique({
    where: { email: session.user.email },
  });
}

// 사용자가 특정 아기(babyId)의 가족 구성원인지 권한 검증
export async function verifyBabyAccess(userId: string, babyId: string) {
  const baby = await prisma.baby.findUnique({
    where: { id: babyId },
    include: {
      household: {
        include: {
          members: {
            where: { userId },
          },
        },
      },
    },
  });

  if (!baby || baby.household.members.length === 0) {
    return null;
  }

  return {
    baby,
    membership: baby.household.members[0],
  };
}

// Prisma ActivityLog -> 프론트엔드 ActivityRecord 변환 헬퍼
export function mapActivityLogToRecord(log: {
  id: string;
  babyId: string;
  category: string;
  startedAt: Date;
  endedAt: Date | null;
  durationSec: number | null;
  amountMl: number | null;
  valueNum: number | null;
  details: unknown;
  note: string | null;
  recorder?: { name: string } | null;
}): ActivityRecord {
  const detailsObj =
    log.details && typeof log.details === "object" && !Array.isArray(log.details)
      ? (log.details as Record<string, unknown>)
      : {};

  const summaryTitle =
    typeof detailsObj.summaryTitle === "string" && detailsObj.summaryTitle
      ? detailsObj.summaryTitle
      : getDefaultSummaryTitle(log.category as ActivityCategory, log);

  const subDetail =
    typeof detailsObj.subDetail === "string"
      ? detailsObj.subDetail
      : log.note ?? undefined;

  const recordedBy =
    typeof detailsObj.recordedByLabel === "string" && detailsObj.recordedByLabel
      ? detailsObj.recordedByLabel
      : log.recorder?.name || "가족";

  return {
    id: log.id,
    babyId: log.babyId,
    category: log.category as ActivityCategory,
    startedAt: log.startedAt.toISOString(),
    endedAt: log.endedAt?.toISOString(),
    durationSec: log.durationSec ?? undefined,
    amountMl: log.amountMl ?? undefined,
    valueNum: log.valueNum ?? undefined,
    recordedBy,
    summaryTitle,
    subDetail,
    note: log.note ?? undefined,
    details: detailsObj,
  };
}

function getDefaultSummaryTitle(
  category: ActivityCategory,
  log: { amountMl: number | null; valueNum: number | null; durationSec: number | null }
): string {
  switch (category) {
    case "FEEDING":
      return log.amountMl ? `수유 ${log.amountMl}ml` : "수유 기록";
    case "SLEEP":
      return log.durationSec
        ? `수면 ${Math.max(1, Math.round(log.durationSec / 60))}분`
        : "수면 기록";
    case "DIAPER":
      return "기저귀 교체";
    case "PUMPING":
      return log.amountMl ? `유축 ${log.amountMl}ml` : "유축 기록";
    case "TEMPERATURE":
      return log.valueNum ? `체온 ${log.valueNum}°C` : "체온 측정";
    case "MEDICATION":
      return "투약 기록";
    case "BATH":
      return "목욕 / 케어";
    case "TUMMY_TIME":
      return "터미타임";
    default:
      return "육아 메모";
  }
}
