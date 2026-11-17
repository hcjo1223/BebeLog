import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser, verifyBabyAccess } from "@/lib/auth-helper";
import { mapActiveTimer } from "@/lib/timers";

const TimerUpsertSchema = z.object({
  babyId: z.string().uuid(),
  category: z.enum([
    "FEEDING_LEFT",
    "FEEDING_RIGHT",
    "SLEEP",
    "PUMPING",
    "TUMMY_TIME",
  ]),
  label: z.string().max(60).optional(),
  status: z.enum(["RUNNING", "PAUSED"]).default("RUNNING"),
  startedAt: z.number().optional(),
  accumulatedSec: z.number().int().min(0).default(0),
});

// 가족이 공유하는 활성 타이머 조회 (다른 기기에서 주기적으로 폴링)
export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const babyId = searchParams.get("babyId");
    if (!babyId || !z.string().uuid().safeParse(babyId).success) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const access = await verifyBabyAccess(user.id, babyId);
    if (!access) {
      return NextResponse.json({ success: false }, { status: 403 });
    }

    const timer = await prisma.activeTimer.findFirst({
      where: { babyId },
      orderBy: { updatedAt: "desc" },
      include: {
        starter: {
          select: {
            name: true,
            households: {
              where: { householdId: access.baby.householdId },
              select: { relationLabel: true },
            },
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: timer ? mapActiveTimer(timer, access.membership.relationLabel) : null,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[GET /api/timers] 오류:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

// 실시간 공유 타이머 시작/일시정지/재개 저장
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const body = await request.json();
    const parsed = TimerUpsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const input = parsed.data;
    const access = await verifyBabyAccess(user.id, input.babyId);
    if (!access) {
      return NextResponse.json({ success: false }, { status: 403 });
    }

    // 아기당 하나의 활성 타이머만 유지한다. 두 기기가 동시에 눌러도 타이머가
    // 둘 남지 않도록 삭제와 생성을 하나의 트랜잭션으로 묶는다.
    const [, created] = await prisma.$transaction([
      prisma.activeTimer.deleteMany({ where: { babyId: input.babyId } }),
      prisma.activeTimer.create({
        data: {
          babyId: input.babyId,
          startedBy: user.id,
          category: input.category,
          startedAt: input.startedAt ? new Date(input.startedAt) : new Date(),
          pausedAt: input.status === "PAUSED" ? new Date() : null,
          accumulatedSec: input.accumulatedSec,
          status: input.status,
          note: input.label ?? null,
        },
      }),
    ]);

    return NextResponse.json({ success: true, data: created });
  } catch (err) {
    console.error("[POST /api/timers] 오류:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

// 활성 타이머 삭제
export async function DELETE(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const babyId = searchParams.get("babyId");
    if (!babyId) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const access = await verifyBabyAccess(user.id, babyId);
    if (!access) {
      return NextResponse.json({ success: false }, { status: 403 });
    }

    await prisma.activeTimer.deleteMany({ where: { babyId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/timers] 오류:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
