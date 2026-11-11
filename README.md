# 🍼 베베로그 (BebeLog) - 모바일 웹(PWA) 육아 기록 & 감성 육아일기

GitHub의 대표적인 육아 트래커 오픈소스 **Baby Buddy**의 정밀한 데이터 모델과 **Memos / Monica**의 감성 타임라인 일기 구조를 결합하여 설계한 모바일 퍼스트 웹 애플리케이션입니다.

## 1. 주요 기능

* **원탭/원핸드(One-Hand) 초간편 기록**: 수유(모유 좌/우, 분유 ml, 이유식), 수면, 기저귀(배변 색상/무르기), 체온, 투약, 목욕을 바텀 시트(Bottom Sheet)에서 3초 만에 기록.
* **가족 간 실시간 타이머 동기화**: 엄마가 시작한 수유/수면 타이머를 아빠나 할머니 화면에서도 실시간으로 확인하고 종료·저장 가능.
* **통합 타임라인 + JSONB 아키텍처**: 단일 `activity_logs` 테이블과 PostgreSQL `JSONB` 상세 속성을 결합하여 고속 타임라인 조회 및 카테고리별 정밀 통계 지원.
* **감성 육아일기 & 자동 일일 요약**: 일기 작성 시 그날의 총 수유량(ml), 총 수면 시간, 기저귀 교체 횟수가 일기 하단에 자동 스냅샷으로 첨부.
* **새벽 수유 다크 모드 & 다둥이 전환**: 눈부심 방지 다크 모드 및 복수 자녀(다둥이) 프로필 즉시 전환 지원.

---

## 2. 로컬 실행 방법

```bash
# 1. 패키지 설치
npm install

# 2. 환경 변수 파일 생성 (.env)
cp .env.example .env

# 3. Prisma 클라이언트 생성 및 DB 스키마 반영 (PostgreSQL 실행 시)
npm run db:generate
npm run db:push
npm run db:seed

# 4. 개발 서버 실행 (http://localhost:3000)
npm run dev
```

---

## 3. OCI (Oracle Cloud) + Coolify 배포 가이드

1. **OCI 인스턴스 준비**:
   * OCI Ampere A1 (`VM.Standard.A1.Flex`, ARM64) 또는 AMD64 인스턴스에 Coolify를 설치합니다.
2. **Coolify PostgreSQL 리소스 생성**:
   * Coolify 대시보드에서 `PostgreSQL 16` 데이터베이스를 생성하고 내부 `DATABASE_URL`을 복사합니다.
3. **Coolify 애플리케이션 배포**:
   * GitHub 저장소를 연결하고 Build Pack을 **Dockerfile** (또는 **Docker Compose**)로 선택합니다.
   * 환경 변수(`Environment Variables`)에 `DATABASE_URL` 및 `OCI_S3_*` 버킷 정보를 등록합니다.
   * 헬스체크 경로는 `/api/health` (포트 `3000`)로 자동 설정되어 무중단 배포가 수행됩니다.
