import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CreateActivityLogSchema } from "@/lib/validators/activity";
import {
  getAuthenticatedUser,
  mapActivityLogToRecord,
  verifyBabyAccess,
} from "@/lib/auth-helper";

const ExtendedCreateActivitySchema = CreateActivityLogSchema.extend({
  summaryTitle: z.string().max(120).optional(),
  subDetail: z.string().max(300).optional(),
  recordedByLabel: z.string().max(30).optional(),
});

// 육아 활동 기록 타임라인 조회 (GET)
export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const babyId = searchParams.get("babyId");
    if (!babyId) {
      return NextResponse.json(
        { success: false, message: "babyId가 필요합니다." },
        { status: 400 }
      );
    }

    const access = await verifyBabyAccess(user.id, babyId);
    if (!access) {
      return NextResponse.json(
        { success: false, message: "접근 권한이 없는 아기입니다." },
        { status: 403 }
      );
    }

    const logs = await prisma.activityLog.findMany({
      where: { babyId },
      orderBy: { startedAt: "desc" },
      take: 150,
      include: { recorder: { select: { name: true } } },
    });

    return NextResponse.json({
      success: true,
      data: logs.map(mapActivityLogToRecord),
    });
  } catch (err) {
    console.error("[GET /api/activities] 오류:", err);
    return NextResponse.json(
      { success: false, message: "기록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 신규 육아 활동 기록 저장 (POST)
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = ExtendedCreateActivitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "입력된 육아 기록 데이터 형식이 올바르지 않습니다.",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const access = await verifyBabyAccess(user.id, input.babyId);
    if (!access) {
      return NextResponse.json(
        { success: false, message: "접근 권한이 없는 아기입니다." },
        { status: 403 }
      );
    }

    const detailsPayload: Record<string, unknown> = {
      ...input.details,
      ...(input.summaryTitle ? { summaryTitle: input.summaryTitle } : {}),
      ...(input.subDetail ? { subDetail: input.subDetail } : {}),
      recordedByLabel: input.recordedByLabel || access.membership.relationLabel,
    };

    const created = await prisma.activityLog.create({
      data: {
        babyId: input.babyId,
        recordedBy: user.id,
        category: input.category,
        startedAt: new Date(input.startedAt),
        endedAt: input.endedAt ? new Date(input.endedAt) : null,
        durationSec: input.durationSec ?? null,
        amountMl: input.amountMl ?? null,
        valueNum: input.valueNum ?? null,
        details: detailsPayload as Prisma.InputJsonValue,
        note: input.note ?? null,
      },
      include: { recorder: { select: { name: true } } },
    });

    return NextResponse.json(
      {
        success: true,
        message: "육아 기록이 DB에 저장되었습니다.",
        data: mapActivityLogToRecord(created),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/activities] 오류:", err);
    return NextResponse.json(
      {
        success: false,
        message: "육아 기록 저장 중 서버 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
