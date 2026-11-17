// 육아일기 첨부 파일 규칙 (서버 업로드 API와 클라이언트 사전 검증이 함께 사용)

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_MEDIA_PER_DIARY = 6;

const ALLOWED_TYPES: Record<string, { ext: string; kind: "IMAGE" | "VIDEO" }> = {
  "image/jpeg": { ext: "jpg", kind: "IMAGE" },
  "image/png": { ext: "png", kind: "IMAGE" },
  "image/webp": { ext: "webp", kind: "IMAGE" },
  "image/gif": { ext: "gif", kind: "IMAGE" },
  "image/heic": { ext: "heic", kind: "IMAGE" },
  "image/heif": { ext: "heif", kind: "IMAGE" },
  "video/mp4": { ext: "mp4", kind: "VIDEO" },
  "video/quicktime": { ext: "mov", kind: "VIDEO" },
  "video/webm": { ext: "webm", kind: "VIDEO" },
};

export type MediaValidation =
  | { ok: true; ext: string; kind: "IMAGE" | "VIDEO" }
  | { ok: false; message: string };

// 업로드 파일의 형식과 크기를 검증한다 (순수 함수)
export function validateMediaFile(contentType: string, size: number): MediaValidation {
  const rule = ALLOWED_TYPES[contentType.toLowerCase()];
  if (!rule) {
    return { ok: false, message: "지원하지 않는 파일 형식입니다. (사진: JPG/PNG/WebP/HEIC, 영상: MP4/MOV/WebM)" };
  }
  if (size <= 0) return { ok: false, message: "빈 파일은 올릴 수 없습니다." };
  const limit = rule.kind === "IMAGE" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (size > limit) {
    return {
      ok: false,
      message: `${rule.kind === "IMAGE" ? "사진" : "영상"}은 ${Math.round(limit / 1024 / 1024)}MB 이하만 올릴 수 있습니다.`,
    };
  }
  return { ok: true, ext: rule.ext, kind: rule.kind };
}
