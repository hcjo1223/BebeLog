import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser, verifyBabyAccess } from "@/lib/auth-helper";

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

    // 아기당 하나의 활성 타이머만 유지하도록 기존 타이머 정리 후 재생성
    await prisma.activeTimer.deleteMany({ where: { babyId: input.babyId } });

    const created = await prisma.activeTimer.create({
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
    });

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
