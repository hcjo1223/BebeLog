import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser, verifyBabyAccess } from "@/lib/auth-helper";

const CreateDiarySchema = z.object({
  babyId: z.string().uuid(),
  diaryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().max(100).optional(),
  content: z.string().min(1, "일기 내용을 입력해주세요.").max(3000),
  mood: z.string().max(10).default("🥰"),
  tags: z.array(z.string()).default([]),
  isMilestone: z.boolean().default(false),
});

// 감성 육아일기 저장 API
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CreateDiarySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "일기 내용을 입력해주세요." },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const access = await verifyBabyAccess(user.id, input.babyId);
    if (!access) {
      return NextResponse.json({ success: false }, { status: 403 });
    }

    const created = await prisma.diaryEntry.create({
      data: {
        babyId: input.babyId,
        authorId: user.id,
        diaryDate: new Date(`${input.diaryDate}T00:00:00.000Z`),
        title: input.title?.trim() || "오늘의 육아일기",
        content: input.content.trim(),
        mood: input.mood,
        tags: input.tags,
        isMilestone: input.isMilestone,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: created.id,
          babyId: created.babyId,
          diaryDate: created.diaryDate.toISOString().slice(0, 10),
          title: created.title || "오늘의 육아일기",
          content: created.content,
          mood: created.mood || "🥰",
          author: access.membership.relationLabel,
          tags: created.tags,
          isMilestone: created.isMilestone,
          photos: [],
          dailySummary: {
            totalFeedingMl: 0,
            totalSleepHours: 0,
            diaperCount: 0,
          },
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/diary] 오류:", err);
    return NextResponse.json(
      { success: false, message: "육아일기 저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
