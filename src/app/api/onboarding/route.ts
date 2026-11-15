import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth-helper";

const OnboardingSchema = z.object({
  householdName: z.string().min(1, "가족 이름을 입력해주세요.").max(40),
  relationLabel: z.string().min(1, "내 호칭을 입력해주세요.").max(20),
  babyName: z.string().min(1, "아기 이름 또는 태명을 입력해주세요.").max(30),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "생년월일 형식이 올바르지 않습니다."),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  gender: z.enum(["M", "F", "UNKNOWN"]).default("UNKNOWN"),
  bloodType: z.string().max(10).optional(),
  weightKg: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
  headCm: z.number().positive().optional(),
});

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// 신규 가족(Household) + 주 양육자 + 첫 아기 프로필 초기 세팅 API
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
    const parsed = OnboardingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "입력값이 올바르지 않습니다.",
          errors: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const birthDateObj = new Date(`${data.birthDate}T00:00:00.000Z`);
    const dueDateObj = data.dueDate ? new Date(`${data.dueDate}T00:00:00.000Z`) : null;

    const result = await prisma.$transaction(async (tx) => {
      const household = await tx.household.create({
        data: {
          name: data.householdName.trim(),
          inviteCode: generateInviteCode(),
        },
      });

      await tx.householdMember.create({
        data: {
          householdId: household.id,
          userId: user.id,
          role: "OWNER",
          relationLabel: data.relationLabel.trim(),
        },
      });

      const baby = await tx.baby.create({
        data: {
          householdId: household.id,
          name: data.babyName.trim(),
          birthDate: birthDateObj,
          dueDate: dueDateObj,
          gender: data.gender,
          bloodType: data.bloodType?.trim() || null,
        },
      });

      if (data.weightKg || data.heightCm || data.headCm) {
        await tx.growthRecord.create({
          data: {
            babyId: baby.id,
            measuredDate: birthDateObj,
            weightKg: data.weightKg ?? null,
            heightCm: data.heightCm ?? null,
            headCm: data.headCm ?? null,
            note: "초기 세팅 기록",
          },
        });
      }

      return { household, baby };
    });

    return NextResponse.json(
      { success: true, data: result },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/onboarding] 오류:", err);
    return NextResponse.json(
      { success: false, message: "초기 세팅 저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
