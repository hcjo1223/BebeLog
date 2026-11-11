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
