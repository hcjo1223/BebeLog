import type { NextConfig } from "next";

// 프로덕션 빌드(npm run build)와 개발 서버(npm run dev)의 캐시 충돌로 인해
// Tailwind CSS(layout.css)가 404로 깨지는 현상을 방지하기 위해 빌드 디렉토리를 분리합니다.
const isProdBuild =
  process.env.DOCKER_BUILD === "true" ||
  process.env.STANDALONE_BUILD === "true" ||
  process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  distDir: process.env.DOCKER_BUILD === "true" ? ".next" : isProdBuild ? ".next-prod" : ".next",
  output: isProdBuild ? "standalone" : undefined,
  reactStrictMode: true,
  // 개발용 표시기가 왼쪽 아래 하단 탭(기록장)을 가려 눌리지 않으므로 끈다
  devIndicators: false,
};

export default nextConfig;


