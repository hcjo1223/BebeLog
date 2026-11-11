import { NextResponse } from "next/server";
import { CreateActivityLogSchema } from "@/lib/validators/activity";
import { INITIAL_ACTIVITIES } from "@/lib/mock-data";

// 육아 활동 기록 타임라인 조회 (GET) 및 신규 기록 저장 (POST) API
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const babyId = searchParams.get("babyId");

  const filtered = babyId
    ? INITIAL_ACTIVITIES.filter((item) => item.babyId === babyId)
    : INITIAL_ACTIVITIES;

  return NextResponse.json({
    success: true,
    data: filtered,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = CreateActivityLogSchema.safeParse(body);

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

    return NextResponse.json(
      {
        success: true,
        message: "육아 기록이 성공적으로 저장되었습니다.",
        data: {
          id: crypto.randomUUID(),
          ...parsed.data,
          createdAt: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "육아 기록 처리 중 서버 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
