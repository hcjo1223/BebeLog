import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthenticatedUser, verifyBabyAccess } from "@/lib/auth-helper";
import { getObject, isStorageConfigured } from "@/lib/storage";

// 비공개 버킷의 육아일기 미디어를 가족 구성원에게만 내려주는 프록시
// (GET /api/media/[id])
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false }, { status: 401 });
    }
    if (!isStorageConfigured()) {
      return NextResponse.json({ success: false }, { status: 503 });
    }

    const { id } = await context.params;
    const media = await prisma.diaryMedia.findUnique({
      where: { id },
      select: { mediaUrl: true, diary: { select: { babyId: true } } },
    });
    if (!media) {
      return NextResponse.json({ success: false }, { status: 404 });
    }

    const access = await verifyBabyAccess(user.id, media.diary.babyId);
    if (!access) {
      return NextResponse.json({ success: false }, { status: 403 });
    }

    const upstream = await getObject(media.mediaUrl, request.headers.get("range"));
    if (!upstream.ok && upstream.status !== 206) {
      return NextResponse.json({ success: false }, { status: 502 });
    }

    const headers = new Headers();
    for (const name of ["content-type", "content-length", "content-range", "accept-ranges", "etag"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    headers.set("Cache-Control", "private, max-age=86400");

    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (err) {
    console.error("[GET /api/media/[id]] 오류:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
