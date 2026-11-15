import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth-helper";

const CreateBabySchema = z.object({
  name: z.string().min(1).max(30),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  gender: z.enum(["M", "F", "UNKNOWN"]).default("UNKNOWN"),
  bloodType: z.string().max(10).optional(),
});

// 기존 가족에 새로운 아기(둘째/쌍둥이) 프로필 추가 API
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const membership = await prisma.householdMember.findFirst({
      where: { userId: user.id },
      orderBy: { joinedAt: "asc" },
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, message: "먼저 가족 초기 세팅을 완료해주세요." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = CreateBabySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "아기 정보 형식이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const baby = await prisma.baby.create({
      data: {
        householdId: membership.householdId,
        name: parsed.data.name.trim(),
        birthDate: new Date(`${parsed.data.birthDate}T00:00:00.000Z`),
        dueDate: parsed.data.dueDate
          ? new Date(`${parsed.data.dueDate}T00:00:00.000Z`)
          : null,
        gender: parsed.data.gender,
        bloodType: parsed.data.bloodType?.trim() || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: baby.id,
        name: baby.name,
        nickname: baby.name,
        birthDate: baby.birthDate.toISOString().slice(0, 10),
        dueDate: baby.dueDate ? baby.dueDate.toISOString().slice(0, 10) : undefined,
        gender: baby.gender === "F" ? "F" : "M",
        bloodType: baby.bloodType || "미정",
        weightKg: 0,
        heightCm: 0,
        headCm: 0,
      },
    });
  } catch (err) {
    console.error("[POST /api/babies] 오류:", err);
    return NextResponse.json(
      { success: false, message: "아기 프로필 추가 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
