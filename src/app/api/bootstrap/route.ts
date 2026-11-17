import { NextResponse } from "next/server";
import { isGoogleAuthConfigured } from "@/auth";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser, mapActivityLogToRecord } from "@/lib/auth-helper";
import { mapActiveTimer } from "@/lib/timers";
import { isStorageConfigured } from "@/lib/storage";
import { parseDiarySummary } from "@/lib/validators/diary";

// 초기 앱 부팅 시 인증 상태, 가족/아기 프로필, 최근 타임라인 데이터를 한 번에 조회
export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({
        authenticated: false,
        googleConfigured: isGoogleAuthConfigured,
      });
    }

    const membership = await prisma.householdMember.findFirst({
      where: { userId: user.id },
      orderBy: { joinedAt: "asc" },
      include: {
        household: {
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, email: true, avatarUrl: true } },
              },
              orderBy: { joinedAt: "asc" },
            },
            babies: {
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });

    if (!membership || membership.household.babies.length === 0) {
      return NextResponse.json({
        authenticated: true,
        googleConfigured: isGoogleAuthConfigured,
        needsOnboarding: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
        },
      });
    }

    const { searchParams } = new URL(request.url);
    const requestedBabyId = searchParams.get("babyId");
    const babies = membership.household.babies;
    const activeBaby =
      babies.find((b) => b.id === requestedBabyId) ?? babies[0];

    // 선택된 아기의 활동, 성장, 일기, 활성 타이머 병렬 조회
    const [activityLogs, growthRecords, diaryEntries, activeTimer] =
      await Promise.all([
        prisma.activityLog.findMany({
          where: { babyId: activeBaby.id },
          orderBy: { startedAt: "desc" },
          take: 150,
          include: { recorder: { select: { name: true } } },
        }),
        prisma.growthRecord.findMany({
          where: { babyId: activeBaby.id },
          orderBy: { measuredDate: "asc" },
        }),
        prisma.diaryEntry.findMany({
          where: { babyId: activeBaby.id },
          orderBy: { diaryDate: "desc" },
          take: 50,
          include: {
            author: { select: { name: true } },
            media: { orderBy: { sortOrder: "asc" } },
          },
        }),
        prisma.activeTimer.findFirst({
          where: { babyId: activeBaby.id },
          orderBy: { updatedAt: "desc" },
          include: {
            starter: {
              select: {
                name: true,
                households: {
                  where: { householdId: membership.householdId },
                  select: { relationLabel: true },
                },
              },
            },
          },
        }),
      ]);

    const latestGrowth = growthRecords[growthRecords.length - 1];

    return NextResponse.json({
      authenticated: true,
      googleConfigured: isGoogleAuthConfigured,
      needsOnboarding: false,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
      household: {
        id: membership.household.id,
        name: membership.household.name,
        inviteCode: membership.household.inviteCode,
        myRelationLabel: membership.relationLabel,
        myRole: membership.role,
        members: membership.household.members.map((m) => ({
          id: m.id,
          relationLabel: m.relationLabel,
          role: m.role,
          name: m.user.name,
          avatarUrl: m.user.avatarUrl,
        })),
      },
      babies: babies.map((b) => ({
        id: b.id,
        name: b.name,
        nickname: b.name,
        birthDate: b.birthDate.toISOString().slice(0, 10),
        dueDate: b.dueDate ? b.dueDate.toISOString().slice(0, 10) : undefined,
        gender: b.gender === "F" ? "F" : "M",
        bloodType: b.bloodType || "미정",
        weightKg: b.id === activeBaby.id ? latestGrowth?.weightKg ?? 0 : 0,
        heightCm: b.id === activeBaby.id ? latestGrowth?.heightCm ?? 0 : 0,
        headCm: b.id === activeBaby.id ? latestGrowth?.headCm ?? 0 : 0,
      })),
      activeBabyId: activeBaby.id,
      activities: activityLogs.map(mapActivityLogToRecord),
      growthRecords: growthRecords.map((g) => {
        const diffDays = Math.max(
          1,
          Math.floor(
            (g.measuredDate.getTime() - activeBaby.birthDate.getTime()) /
              (1000 * 60 * 60 * 24)
          ) + 1
        );
        return {
          id: g.id,
          date: g.measuredDate.toISOString().slice(0, 10),
          ageDays: diffDays,
          weightKg: g.weightKg ?? 0,
          heightCm: g.heightCm ?? 0,
          headCm: g.headCm ?? 0,
          note: g.note ?? undefined,
        };
      }),
      diaryEntries: diaryEntries.map((d) => ({
        id: d.id,
        babyId: d.babyId,
        diaryDate: d.diaryDate.toISOString().slice(0, 10),
        title: d.title || "오늘의 육아일기",
        content: d.content,
        mood: d.mood || "🥰",
        author: d.author?.name || membership.relationLabel,
        tags: d.tags,
        isMilestone: d.isMilestone,
        photos: d.media.map((m) => ({
          id: m.id,
          url: `/api/media/${m.id}`,
          type: m.mediaType === "VIDEO" ? ("VIDEO" as const) : ("IMAGE" as const),
        })),
        dailySummary: parseDiarySummary(d.dailySummary),
      })),
      activeTimer: activeTimer
        ? mapActiveTimer(activeTimer, membership.relationLabel)
        : null,
      mediaConfigured: isStorageConfigured(),
    });
  } catch (err) {
    console.error("[GET /api/bootstrap] 오류:", err);
    return NextResponse.json(
      { success: false, message: "초기 데이터를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
