# ============================================================================
# OCI (ARM64 Ampere A1 & AMD64 호환) + Coolify 최적화 멀티스테이지 Dockerfile
# ============================================================================

FROM node:22-alpine AS base
# Prisma OpenSSL 호환성을 위한 패키지 설치
RUN apk add --no-cache libc6-compat openssl

# 1. 의존성 설치 스테이지
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm install

# 2. 빌드 스테이지 (OCI 1GB RAM + 8GB Swap 저사양 인스턴스 OOM 방지 최적화)
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV DOCKER_BUILD="true"
ENV NODE_OPTIONS="--max-old-space-size=1024"
RUN npx prisma generate
RUN npm run build

# 3. 프로덕션 런타임 스테이지 (경량 Standalone 실행)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 헬스체크 설정 (Coolify 무중단 배포 상태 확인용)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
