# 🍼 베베로그 (BebeLog) 에이전트 개발 규칙 & 스킬 가이드라인

이 프로젝트는 [`sickn33/agentic-awesome-skills`](https://github.com/sickn33/agentic-awesome-skills) 카탈로그에서 엄선된 17개 전문 스킬(`.agents/skills/`)을 기반으로 개발 및 유지보수됩니다.

## 1. 설치된 프로젝트 스킬 카탈로그 (`.agents/skills/`)

| 영역 | 스킬 ID (`name`) | 적용 시점 및 역할 |
| :--- | :--- | :--- |
| **모바일 웹 / UX** | `mobile-design` | 모바일 퍼스트 터치 타겟(48px 이상), 원핸드 Thumb Zone, 오프라인 대응 설계 |
| **UI 상태 / 접근성** | `ui-states`, `ui-a11y` | Empty / Loading / Offline / Undo Toast 등 엣지 케이스 상태 및 WCAG 접근성 |
| **프론트엔드 / Next.js** | `nextjs-app-router-patterns`, `nextjs-best-practices`, `react-best-practices`, `tailwind-patterns`, `frontend-api-integration-patterns` | Next.js 15 App Router, React 19, Tailwind CSS 컴포넌트 및 API 연동 |
| **타입스크립트** | `typescript-expert` | 엄격한 타입 안정성 및 Zod 런타임 스키마 연동 |
| **데이터베이스 / ORM** | `prisma-expert`, `postgres-best-practices`, `database-architect` | PostgreSQL 16 + Prisma 스키마, 복합 인덱스, JSONB 최적화 |
| **인프라 (OCI+Coolify)** | `docker-expert`, `docker-compose` | ARM64/AMD64 멀티스테이지 Dockerfile, `.dockerignore`, 컨테이너 보안 |
| **엔지니어링 코어** | `concise-planning`, `systematic-debugging`, `test-driven-development` | 체계적 계획 수립, 원인 기반 디버깅, TDD 루프 |

## 2. 핵심 아키텍처 원칙

1. **Mobile-First & Touch-First (`mobile-design`)**:
   - 모든 주요 액션 버튼과 탭 아이템은 최소 `44px ~ 48px` 이상의 터치 영역(Hit Area)을 보장합니다.
   - 아기를 안고 한 손으로 조작하는 환경을 고려하여 주요 CTA는 화면 하단(Thumb Zone)과 바텀 시트(Bottom Sheet)에 배치합니다.
2. **Complete UI States (`ui-states`)**:
   - 타임라인이나 일기 목록이 비어 있을 때 단순 텍스트 대신 즉시 행동할 수 있는 첫 기록 유도 버튼(Empty State CTA)을 제공합니다.
   - 기록 삭제 시 실수를 복구할 수 있도록 **실행 취소(Undo) 토스트**를 제공하고, 네트워크 단절(Offline) 배너를 표시합니다.
3. **Database & Prisma Hygiene (`prisma-expert`, `postgres-best-practices`)**:
   - 타임라인 조회(`babyId + startedAt DESC`) 및 외래키(`recordedBy`, `startedBy`) 인덱스를 항상 유지합니다.

## 3. 검증 명령 (`test-driven-development`)

변경 후 아래 세 가지를 모두 통과시킵니다.

```bash
npm test          # Vitest 단위 테스트 (src/lib/__tests__)
npm run lint      # ESLint (next/core-web-vitals + typescript)
npm run typecheck # tsc --noEmit
```

- 날짜 계산, 일일 요약 집계, 기록 변환처럼 화면과 무관한 로직은 `src/lib/`의 순수 함수로 두고 테스트를 먼저 작성합니다.

## 4. UI 구현 규칙

- **구조**: `src/app/page.tsx`는 상태와 서버 동기화만 담당합니다. 화면은 `src/components/tabs/`, 입력 시트는 `src/components/sheets/`, 공용 부품은 `src/components/ui/`에 둡니다.
- **색상 토큰**: 컴포넌트에 색상 hex를 직접 쓰지 않고 `tailwind.config.ts`의 `sprout-*`(브랜드 틸), `night-*`(다크 표면)을 사용합니다. 흰 글씨를 올리는 배경은 `sprout-600` 이상(대비 4.5:1)을 씁니다.
- **공용 클래스** (`globals.css`): `.btn-primary`, `.btn-secondary`, `.chip`, `.field`, `.field-label`, `.icon-btn`, `.card`, `.text-muted`.
- **터치/글자 크기**: 누를 수 있는 요소는 44px 이상, 본문·보조 글자는 12px 이상, 입력 필드는 16px(iOS 자동 확대 방지).
- **아이콘**: 구조적 아이콘은 `lucide-react`를 쓰고 이모지를 아이콘으로 쓰지 않습니다. 장식용 아이콘에는 `aria-hidden="true"`, 아이콘만 있는 버튼에는 `aria-label`을 붙입니다.
- **모달**: 새 입력 화면은 `BottomSheet`를 사용합니다(포커스 가둠, Esc 닫기, 안전 영역 처리 포함).
