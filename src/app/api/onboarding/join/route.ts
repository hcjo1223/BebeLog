import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth-helper";

const JoinSchema = z.object({
  inviteCode: z.string().min(4).max(16),
  relationLabel: z.string().min(1).max(20),
});

// 초대 코드로 기존 가족(Household)에 공동 양육자로 합류하는 API
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
    const parsed = JoinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "초대 코드와 호칭을 정확히 입력해주세요." },
        { status: 400 }
      );
    }

    const normalizedCode = parsed.data.inviteCode.trim().toUpperCase();
    const household = await prisma.household.findUnique({
      where: { inviteCode: normalizedCode },
    });

    if (!household) {
      return NextResponse.json(
        { success: false, message: "유효하지 않은 가족 초대 코드입니다." },
        { status: 404 }
      );
    }

    const member = await prisma.householdMember.upsert({
      where: {
        householdId_userId: {
          householdId: household.id,
          userId: user.id,
        },
      },
      update: {
        relationLabel: parsed.data.relationLabel.trim(),
      },
      create: {
        householdId: household.id,
        userId: user.id,
        role: "PARENT",
        relationLabel: parsed.data.relationLabel.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      data: { household, member },
    });
  } catch (err) {
    console.error("[POST /api/onboarding/join] 오류:", err);
    return NextResponse.json(
      { success: false, message: "가족 합류 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
