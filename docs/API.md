# 베베로그 (BebeLog) API 명세서

이 문서는 베베로그 애플리케이션의 핵심 API 엔드포인트와 요청/응답 스키마를 정의합니다.

---

## 1. 헬스 체크 API (Health Check)

시스템 및 컨테이너 가동 상태를 확인하기 위한 엔드포인트입니다.

- **URL**: `/api/health`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "status": "ok",
    "timestamp": "2026-11-10T12:00:00.000Z"
  }
  ```

---

## 2. 육아 활동 기록 API (Activity Logs)

영유아의 일상 활동(수유, 수면, 배변, 체온, 투약 등)을 조회하고 새롭게 기록하는 엔드포인트입니다.

### 2.1 활동 타임라인 조회 (List Activities)
- **URL**: `/api/activities`
- **Method**: `GET`
- **Query Parameters**:
  - `babyId` (선택, UUID): 특정 아이의 활동 기록만 필터링하여 조회합니다.
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "uuid",
        "babyId": "uuid",
        "category": "FEEDING",
        "startedAt": "2026-11-10T08:30:00.000Z",
        "amountMl": 160,
        "recordedBy": "엄마",
        "summaryTitle": "분유 수유 160ml",
        "details": {
          "feedingType": "FORMULA"
        }
      }
    ]
  }
  ```

---

### 2.2 활동 기록 등록 (Create Activity)
- **URL**: `/api/activities`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`
- **Request Body (Zod 검증 스키마 기반)**:

| 필드명 | 타입 | 필수 여부 | 설명 |
| :--- | :--- | :---: | :--- |
| `babyId` | String (UUID) | 필수 | 대상 아이의 식별자 |
| `category` | Enum | 필수 | 활동 카테고리 (`FEEDING`, `SLEEP`, `DIAPER`, `PUMPING`, `TEMPERATURE`, `MEDICATION`, `BATH`, `TUMMY_TIME`, `NOTE`) |
| `startedAt` | String (ISO 8601) | 필수 | 활동 시작 또는 발생 일시 |
| `endedAt` | String (ISO 8601) | 선택 | 활동 종료 일시 (수면, 수유 등) |
| `durationSec` | Integer | 선택 | 지속 시간(초 단위) |
| `amountMl` | Float | 선택 | 섭취량 또는 유축량 (ml) |
| `valueNum` | Float | 선택 | 체온(°C) 등 수치형 기록 데이터 |
| `details` | Object (JSONB) | 선택 | 카테고리별 세부 속성 (아래 참조) |
| `note` | String (최대 500자) | 선택 | 추가 메모 사항 |

#### 카테고리별 `details` 세부 명세:

1. **수유 (`FEEDING`)**:
   - `feedingType`: `"BREAST"` | `"FORMULA"` | `"PUMPED_MILK"` | `"SOLID_FOOD"`
   - `breastSide`: `"LEFT"` | `"RIGHT"` | `"BOTH"`
   - `leftDurationSec`, `rightDurationSec`: 좌/우 수유 지속 초
   - `solidFoodMenu`: 이유식 메뉴명 (예: "소고기브로콜리미음")
   - `allergyReaction`: 알레르기 발생 여부 (`true` / `false`)

2. **수면 (`SLEEP`)**:
   - `sleepType`: `"NAP"` (낮잠) | `"NIGHT"` (밤잠)
   - `wakeCount`: 중간에 깬 횟수
   - `sleepQuality`: `"GOOD"` | `"NORMAL"` | `"RESTLESS"`

3. **기저귀 (`DIAPER`)**:
   - `diaperType`: `"WET"` (소변) | `"SOLID"` (대변) | `"BOTH"` (혼합)
   - `stoolColor`: `"YELLOW"` | `"BROWN"` | `"GREEN"` | `"BLACK"` | `"RED"`
   - `stoolConsistency`: `"SOFT"` | `"WATERY"` | `"PASTY"` | `"HARD"`
   - `amountLevel`: `"LITTLE"` | `"NORMAL"` | `"HEAVY"`

4. **유축 (`PUMPING`)**:
   - `leftAmountMl`, `rightAmountMl`: 좌/우 유축량 (ml)

5. **투약 (`MEDICATION`)**:
   - `medicineName`: 약물 이름 (예: "챔프 시럽(아세트아미노펜)")
   - `ingredientType`: `"ACETAMINOPHEN"` | `"IBUPROFEN"` | `"DEXIBUPROFEN"` | `"OTHER"`
   - `dosageMl`: 복용량 (ml)

---

- **성공 응답 (201 Created)**:
  ```json
  {
    "success": true,
    "message": "육아 기록이 성공적으로 저장되었습니다.",
    "data": {
      "id": "created-uuid",
      "babyId": "...",
      "category": "FEEDING",
      "createdAt": "2026-11-10T12:30:00.000Z"
    }
  }
  ```

- **실패 응답 (400 Bad Request - 유효성 검증 실패)**:
  ```json
  {
    "success": false,
    "message": "입력된 육아 기록 데이터 형식이 올바르지 않습니다.",
    "errors": {
      "fieldErrors": {
        "category": ["Invalid enum value..."]
      }
    }
  }
  ```

---

### 2.3 활동 기록 삭제 (Delete Activity)
- **URL**: `/api/activities/{id}`
- **Method**: `DELETE`
- **Response**: `200 { "success": true }` · 기록 없음 `404` · 다른 가족의 기록 `403`

---

## 3. 초기 데이터 API (Bootstrap)

앱을 열거나 화면으로 돌아올 때 인증 상태와 선택한 아기의 데이터를 한 번에 가져옵니다.

- **URL**: `/api/bootstrap`
- **Method**: `GET`
- **Query Parameters**: `babyId` (선택) — 생략하면 가족의 첫 번째 아기
- **Response (200 OK)**:

| 필드 | 설명 |
| :--- | :--- |
| `authenticated` | 로그인 여부. `false`면 아래 필드는 없습니다 |
| `googleConfigured` | 서버에 Google OAuth 키가 설정되어 있는지 |
| `needsOnboarding` | `true`면 가족/아기 초기 설정이 필요합니다 |
| `user`, `household` | 내 계정, 가족 정보(초대 코드, 구성원 목록) |
| `babies`, `activeBabyId` | 아기 프로필 목록과 현재 선택된 아기 |
| `activities` | 최근 활동 150건 (최신순) |
| `growthRecords` | 신체 측정 기록 (측정일 오름차순) |
| `diaryEntries` | 최근 일기 50건. 각 항목에 `photos[]`, `dailySummary` 포함 |
| `activeTimer` | 진행 중인 공유 타이머 또는 `null` |
| `mediaConfigured` | 사진 저장소(OCI Object Storage)가 설정되어 있는지 |

---

## 4. 공유 타이머 API (Timers)

아기 한 명당 타이머는 하나만 유지됩니다. 클라이언트는 10초마다 `GET`으로 다른 가족 기기의 변경을 가져옵니다.

### 4.1 타이머 조회
- **URL**: `/api/timers?babyId={uuid}`
- **Method**: `GET`
- **Response**: `{ "success": true, "data": RunningTimer | null }`
  ```json
  {
    "id": "uuid",
    "category": "SLEEP",
    "label": "수면",
    "startedAt": 1794356400000,
    "startedBy": "엄마",
    "isPaused": false,
    "accumulatedSec": 0
  }
  ```

### 4.2 타이머 시작 / 일시정지 / 재개
- **URL**: `/api/timers`
- **Method**: `POST`

| 필드명 | 타입 | 필수 | 설명 |
| :--- | :--- | :---: | :--- |
| `babyId` | String (UUID) | 필수 | 대상 아기 |
| `category` | Enum | 필수 | `FEEDING_LEFT`, `FEEDING_RIGHT`, `SLEEP`, `PUMPING`, `TUMMY_TIME` |
| `label` | String (최대 60자) | 선택 | 화면 표시용 이름 |
| `status` | Enum | 선택 | `RUNNING`(기본) 또는 `PAUSED` |
| `startedAt` | Number (ms) | 선택 | 시작(재개) 시각 |
| `accumulatedSec` | Integer | 선택 | 일시정지 전까지 누적된 초 |

기존 타이머 삭제와 새 타이머 생성은 하나의 트랜잭션으로 처리됩니다.

### 4.3 타이머 종료
- **URL**: `/api/timers?babyId={uuid}`
- **Method**: `DELETE`
- 종료 후 기록 저장은 클라이언트가 `POST /api/activities`로 수행합니다.

---

## 5. 육아일기 API (Diary)

### 5.1 일기 작성
- **URL**: `/api/diary`
- **Method**: `POST`

| 필드명 | 타입 | 필수 | 설명 |
| :--- | :--- | :---: | :--- |
| `babyId` | String (UUID) | 필수 | 대상 아기 |
| `diaryDate` | String (`YYYY-MM-DD`) | 필수 | 일기 날짜 |
| `content` | String (1~3000자) | 필수 | 본문 |
| `title` | String (최대 100자) | 선택 | 생략 시 "오늘의 육아일기" |
| `mood` | String | 선택 | 기분 이모지 |
| `tags` | String[] | 선택 | 해시태그 |
| `isMilestone` | Boolean | 선택 | 발달 이정표 여부 |
| `dailySummary` | Object | 선택 | 작성 시점 요약 스냅샷 `{ totalFeedingMl, totalSleepHours, diaperCount }` |

- **Response**: `201 { "success": true, "data": DiaryItem }`

### 5.2 사진·영상 첨부
- **URL**: `/api/diary/{id}/media`
- **Method**: `POST` (`multipart/form-data`, 필드명 `file`, 요청당 파일 1개)
- **제한**: 일기당 최대 6개 · 사진 10MB(JPG/PNG/WebP/GIF/HEIC) · 영상 50MB(MP4/MOV/WebM)
- **Response**: `201 { "success": true, "data": { "id": "uuid", "url": "/api/media/{id}", "type": "IMAGE" } }`
- **오류**: 형식/용량/개수 초과 `400` · 저장소 미설정 `503`

### 5.3 첨부 파일 보기
- **URL**: `/api/media/{id}`
- **Method**: `GET`
- 버킷은 비공개이며, 서버가 가족 구성원인지 확인한 뒤 파일을 내려줍니다. 영상 탐색을 위한 `Range` 요청을 지원합니다.

---

## 6. 성장 기록 API (Growth)

- **URL**: `/api/growth`
- **Method**: `POST`

| 필드명 | 타입 | 필수 | 설명 |
| :--- | :--- | :---: | :--- |
| `babyId` | String (UUID) | 필수 | 대상 아기 |
| `measuredDate` | String (`YYYY-MM-DD`) | 필수 | 측정일 |
| `weightKg`, `heightCm`, `headCm` | Number (양수) | 선택 | 측정한 항목만 전송 |
| `note` | String (최대 200자) | 선택 | 메모 |

- **Response**: `201 { "success": true, "data": GrowthItem }`

---

## 7. 아기 · 가족 API

### 7.1 아기 추가 (둘째/쌍둥이)
- **URL**: `/api/babies`
- **Method**: `POST`
- **Body**: `name`(필수), `birthDate`(필수, `YYYY-MM-DD`), `dueDate`, `gender`(`M`/`F`/`UNKNOWN`), `bloodType`

### 7.2 가족 초기 설정
- **URL**: `/api/onboarding`
- **Method**: `POST`
- 새 가족과 첫 아기 프로필을 만들고 초대 코드를 발급합니다.

### 7.3 초대 코드로 합류
- **URL**: `/api/onboarding/join`
- **Method**: `POST`
- 가족이 공유한 초대 코드로 기존 가족에 합류합니다.

---

## 공통 사항

- 헬스 체크와 인증 경로를 제외한 모든 API는 로그인 세션이 필요하며, 없으면 `401`을 반환합니다.
- 아기 단위 API는 요청자가 해당 아기의 가족 구성원인지 확인하고, 아니면 `403`을 반환합니다.
