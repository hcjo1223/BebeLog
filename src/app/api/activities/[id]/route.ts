import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser, verifyBabyAccess } from "@/lib/auth-helper";

// 육아 활동 기록 삭제 API (DELETE /api/activities/[id])
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const existing = await prisma.activityLog.findUnique({
      where: { id },
      select: { id: true, babyId: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "삭제할 기록을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const access = await verifyBabyAccess(user.id, existing.babyId);
    if (!access) {
      return NextResponse.json(
        { success: false, message: "삭제 권한이 없습니다." },
        { status: 403 }
      );
    }

    await prisma.activityLog.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "기록이 삭제되었습니다.",
    });
  } catch (err) {
    console.error("[DELETE /api/activities/[id]] 오류:", err);
    return NextResponse.json(
      { success: false, message: "기록 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
