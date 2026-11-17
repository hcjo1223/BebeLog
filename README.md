# 🍼 베베로그 (BebeLog) - 모바일 웹(PWA) 육아 기록 & 감성 육아일기

GitHub의 대표적인 육아 트래커 오픈소스 **Baby Buddy**의 정밀한 데이터 모델과 **Memos / Monica**의 감성 타임라인 일기 구조를 결합하여 설계한 모바일 퍼스트 웹 애플리케이션입니다.

## 1. 주요 기능

* **원탭/원핸드(One-Hand) 초간편 기록**: 수유(모유 좌/우, 분유 ml, 이유식), 수면, 기저귀(배변 색상/무르기), 체온, 투약, 목욕을 바텀 시트(Bottom Sheet)에서 3초 만에 기록.
* **가족 간 타이머 공유**: 엄마가 시작한 수유/수면 타이머가 약 10초 안에 아빠나 할머니 화면에 나타나고, 누구든 종료·저장할 수 있습니다. 화면으로 돌아오거나 1분마다 다른 가족의 기록도 자동으로 갱신됩니다.
* **오프라인 기록 보관**: 연결이 끊겨도 기록을 남길 수 있고, 연결되면 자동으로 서버에 전송합니다. (앱을 닫기 전까지 기기 메모리에 보관)
* **통합 타임라인 + JSONB 아키텍처**: 단일 `activity_logs` 테이블과 PostgreSQL `JSONB` 상세 속성을 결합하여 고속 타임라인 조회 및 카테고리별 통계 지원.
* **날짜별 기록장 · 월간 캘린더 · 성장 리포트**: 날짜를 넘겨 지난 기록을 보고, 캘린더에서 기록·일기·이정표가 있는 날을 확인하며, 몸무게/키/머리둘레 추이를 그래프로 봅니다.
* **감성 육아일기 & 일일 요약 스냅샷**: 일기 작성 시 그날의 분유량(ml), 수면 시간, 기저귀 교체 횟수가 함께 저장됩니다. OCI Object Storage를 연결하면 사진·영상(일기당 6개)을 첨부할 수 있습니다.
* **Google OAuth 로그인 & 가족 초대 코드**: Google 계정으로 로그인 후 새 가족·아기 프로필을 만들거나 초대 코드로 합류합니다. 둘째·쌍둥이는 상단 아이 선택 메뉴에서 추가합니다.
* **다크 모드 & 수유방 모드(Nursery Mode)**: 큰 버튼의 원탭 기록, 색조·밝기 조절, 화면 꺼짐 방지(Screen Wake Lock API 지원 브라우저).

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

# 5. 검사 (단위 테스트 / 린트 / 타입)
npm test
npm run lint
npm run typecheck
```

> 스키마가 바뀐 버전으로 올릴 때는 `npm run db:push`를 다시 실행해 새 인덱스와 `diary_entries.daily_summary` 컬럼을 반영하세요.

---

## 3. OCI (Oracle Cloud) + Coolify 배포 가이드

1. **OCI 인스턴스 준비**:
   * OCI Ampere A1 (`VM.Standard.A1.Flex`, ARM64) 또는 AMD64 인스턴스에 Coolify를 설치합니다.
2. **Coolify PostgreSQL 리소스 생성**:
   * Coolify 대시보드에서 `PostgreSQL 16` 데이터베이스를 생성하고 내부 `DATABASE_URL`을 복사합니다.
3. **Coolify 애플리케이션 배포**:
   * GitHub 저장소를 연결하고 Build Pack을 **Dockerfile** (또는 **Docker Compose**)로 선택합니다.
   * 환경 변수(`Environment Variables`)에 아래 항목을 등록합니다:
     * `DATABASE_URL`: PostgreSQL 16 연결 주소
     * `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, `AUTH_URL=https://<도메인>`
     * `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (Google Cloud Console OAuth 2.0)
     * `OCI_S3_ENDPOINT`, `OCI_S3_REGION`, `OCI_S3_BUCKET`, `OCI_S3_ACCESS_KEY_ID`, `OCI_S3_SECRET_ACCESS_KEY` (선택: 육아일기 사진/영상 저장용. 비공개 버킷을 사용하며, 미설정 시 일기는 글만 저장됩니다)
   * Google OAuth는 외부 도메인에서 `https://` 콜백 URI(`<도메인>/api/auth/callback/google`)를 요구하므로 Coolify Traefik에서 Let's Encrypt SSL을 활성화합니다.
   * 헬스체크 경로는 `/api/health` (포트 `3000`)로 자동 설정되어 무중단 배포가 수행됩니다.
