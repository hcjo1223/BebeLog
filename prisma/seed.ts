import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 초기 테스트 및 Coolify 배포 직후 확인용 샘플 데이터 시드 스크립트
async function main() {
  console.log("🌱 육아 기록 및 육아일기 초기 시드 데이터 생성을 시작합니다...");

  // 1. 기본 사용자(엄마, 아빠) 생성
  const mom = await prisma.user.upsert({
    where: { email: "mom@bebelog.kr" },
    update: {},
    create: {
      email: "mom@bebelog.kr",
      name: "김지영 (엄마)",
    },
  });

  const dad = await prisma.user.upsert({
    where: { email: "dad@bebelog.kr" },
    update: {},
    create: {
      email: "dad@bebelog.kr",
      name: "이현우 (아빠)",
    },
  });

  // 2. 가족 그룹(Household) 및 구성원 연결
  const household = await prisma.household.upsert({
    where: { inviteCode: "BEBE-2026" },
    update: {},
    create: {
      name: "튼튼이네 가족",
      inviteCode: "BEBE-2026",
      members: {
        create: [
          { userId: mom.id, role: "OWNER", relationLabel: "엄마" },
          { userId: dad.id, role: "PARENT", relationLabel: "아빠" },
        ],
      },
    },
  });

  // 3. 아이 프로필 생성
  const baby = await prisma.baby.create({
    data: {
      householdId: household.id,
      name: "김하준",
      birthDate: new Date("2026-08-05"),
      dueDate: new Date("2026-08-10"),
      gender: "M",
      bloodType: "A+",
    },
  });

  // 4. 샘플 육아 활동 기록(ActivityLog) 생성
  await prisma.activityLog.createMany({
    data: [
      {
        babyId: baby.id,
        recordedBy: mom.id,
        category: "FEEDING",
        startedAt: new Date(Date.now() - 85 * 60 * 1000),
        amountMl: 160,
        details: { feedingType: "FORMULA" },
        note: "트름 완료 · 남김 없이 다 먹음",
      },
      {
        babyId: baby.id,
        recordedBy: dad.id,
        category: "DIAPER",
        startedAt: new Date(Date.now() - 130 * 60 * 1000),
        details: {
          diaperType: "BOTH",
          stoolColor: "YELLOW",
          stoolConsistency: "SOFT",
        },
        note: "황금변 · 양 많음",
      },
    ],
  });

  // 5. 샘플 신체 성장 기록(GrowthRecord) 생성
  await prisma.growthRecord.create({
    data: {
      babyId: baby.id,
      measuredDate: new Date("2026-11-05"),
      weightKg: 6.4,
      heightCm: 62.5,
      headCm: 40.8,
      note: "생후 3개월차 정기 측정",
    },
  });

  // 6. 샘플 감성 육아일기(DiaryEntry) 생성
  await prisma.diaryEntry.create({
    data: {
      babyId: baby.id,
      authorId: mom.id,
      diaryDate: new Date("2026-11-10"),
      title: "스스로 뒤집기에 처음 성공한 날! 🎉",
      content:
        "아침 터미타임 매트에 눕혀놓았더니 혼자 힘으로 완벽하게 뒤집기에 성공했다!",
      mood: "🥰",
      tags: ["첫뒤집기", "생후97일", "폭풍성장"],
      isMilestone: true,
    },
  });

  console.log("✅ 초기 시드 데이터 생성이 완료되었습니다.");
}

main()
  .catch((e) => {
    console.error("❌ 시드 데이터 생성 중 오류가 발생했습니다:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
