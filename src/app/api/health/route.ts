import { NextResponse } from "next/server";

// Coolify 컨테이너 상태 점검(Healthcheck)을 위한 엔드포인트
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "bebelog-mobile-web",
    infrastructure: "OCI + Coolify",
    timestamp: new Date().toISOString(),
  });
}
