import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser, verifyBabyAccess } from "@/lib/auth-helper";
import {
  MAX_MEDIA_PER_DIARY,
  isStorageConfigured,
  putObject,
  validateMediaFile,
} from "@/lib/storage";

// 육아일기 사진/영상 첨부 API (POST /api/diary/[id]/media, multipart "file")
export async function POST(
  request: Request,
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

    if (!isStorageConfigured()) {
      return NextResponse.json(
        { success: false, message: "사진 저장소(OCI Object Storage)가 설정되지 않았습니다." },
        { status: 503 }
      );
    }

    const { id } = await context.params;
    const diary = await prisma.diaryEntry.findUnique({
      where: { id },
      select: { id: true, babyId: true, _count: { select: { media: true } } },
    });
    if (!diary) {
      return NextResponse.json(
        { success: false, message: "일기를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const access = await verifyBabyAccess(user.id, diary.babyId);
    if (!access) {
      return NextResponse.json(
        { success: false, message: "첨부 권한이 없습니다." },
        { status: 403 }
      );
    }

    if (diary._count.media >= MAX_MEDIA_PER_DIARY) {
      return NextResponse.json(
        { success: false, message: `일기 한 편에는 최대 ${MAX_MEDIA_PER_DIARY}개까지 첨부할 수 있습니다.` },
        { status: 400 }
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "첨부할 파일이 없습니다." },
        { status: 400 }
      );
    }

    const validation = validateMediaFile(file.type, file.size);
    if (!validation.ok) {
      return NextResponse.json(
        { success: false, message: validation.message },
        { status: 400 }
      );
    }

    const key = `diary/${diary.babyId}/${diary.id}/${randomUUID()}.${validation.ext}`;
    await putObject(key, await file.arrayBuffer(), file.type);

    const created = await prisma.diaryMedia.create({
      data: {
        diaryId: diary.id,
        mediaUrl: key,
        mediaType: validation.kind,
        sortOrder: diary._count.media,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: created.id,
          url: `/api/media/${created.id}`,
          type: validation.kind,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/diary/[id]/media] 오류:", err);
    return NextResponse.json(
      { success: false, message: "파일 업로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
