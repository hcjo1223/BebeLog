import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/db";

// 세션 타입 확장: DB의 User UUID(id)를 세션에 포함
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

export const isGoogleAuthConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret:
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "bebelog-dev-fallback-secret-change-in-production",
  session: {
    strategy: "jwt",
  },
  providers: isGoogleAuthConfigured
    ? [
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
      ]
    : [],
  callbacks: {
    // Google 로그인 시 PostgreSQL users 테이블에 사용자 자동 생성/갱신
    async signIn({ user }) {
      if (!user.email) return false;
      try {
        await prisma.user.upsert({
          where: { email: user.email },
          update: {
            name: user.name || user.email.split("@")[0],
            avatarUrl: user.image || null,
          },
          create: {
            email: user.email,
            name: user.name || user.email.split("@")[0],
            avatarUrl: user.image || null,
          },
        });
        return true;
      } catch (err) {
        console.error("[Auth] 사용자 DB 동기화 실패:", err);
        return false;
      }
    },
    // JWT 토큰에 DB의 User UUID 저장
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true },
        });
        if (dbUser) {
          token.userId = dbUser.id;
        }
      }
      return token;
    },
    // 클라이언트/서버 세션에서 session.user.id로 DB UUID 접근 가능
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
});
