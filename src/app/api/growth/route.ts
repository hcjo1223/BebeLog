import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser, verifyBabyAccess } from "@/lib/auth-helper";

const CreateGrowthSchema = z.object({
  babyId: z.string().uuid(),
  measuredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weightKg: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
  headCm: z.number().positive().optional(),
  note: z.string().max(200).optional(),
});

// 신체 성장(몸무게/키/머리둘레) 기록 저장 API
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CreateGrowthSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "성장 측정 수치를 올바르게 입력해주세요." },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const access = await verifyBabyAccess(user.id, input.babyId);
    if (!access) {
      return NextResponse.json({ success: false }, { status: 403 });
    }

    const measured = new Date(`${input.measuredDate}T00:00:00.000Z`);
    const created = await prisma.growthRecord.create({
      data: {
        babyId: input.babyId,
        measuredDate: measured,
        weightKg: input.weightKg ?? null,
        heightCm: input.heightCm ?? null,
        headCm: input.headCm ?? null,
        note: input.note ?? null,
      },
    });

    const ageDays = Math.max(
      1,
      Math.floor(
        (measured.getTime() - access.baby.birthDate.getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          id: created.id,
          date: created.measuredDate.toISOString().slice(0, 10),
          ageDays,
          weightKg: created.weightKg ?? 0,
          heightCm: created.heightCm ?? 0,
          headCm: created.headCm ?? 0,
          note: created.note ?? undefined,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/growth] 오류:", err);
    return NextResponse.json(
      { success: false, message: "성장 기록 저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
