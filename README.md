# 자습실 예약 MVP

하이컨시 과제 전형 **지정 주제 1** (Vue 3 + NestJS)

강사는 자습실(최대 인원, 운영 기간)을 등록·수정·삭제하고 신청 이력을 확인합니다. 학생은 방문을 신청·수정·취소하고, 자기 신청이 지금 어떤 상태인지(누가 왜 취소했는지까지) 확인합니다.

- [실행 방법](#1-실행-방법)
- [기술 스택과 선택 이유](#2-기술-스택과-선택-이유)
- [아키텍처와 컨벤션](#3-아키텍처와-컨벤션)
- [DB 스키마와 설계 이유](#4-db-스키마와-설계-이유)
- [고민한 점](#5-고민한-점)
- [알려진 한계](#6-알려진-한계)

---

## 1. 실행 방법

### 요구 사항

- **Node.js 22.12 이상** (`.nvmrc`), npm 10 이상
  - 22.12 미만에서는 `npm install`이 `EBADENGINE` 오류로 멈춥니다(`.npmrc`의 `engine-strict`). 실행 중에 알 수 없는 오류로 깨지는 대신 설치 단계에서 이유를 알려주려는 설정입니다. API(CommonJS)가 공용 패키지(ESM)를 `require(esm)`으로 불러오기 때문에 이 버전이 필요합니다.
  - Node를 맞추기 어렵다면 아래 [Docker로 실행](#docker로-실행)을 쓰세요.
- 별도 DB 설치, `.env` 파일, 외부 서비스가 **필요 없습니다.** DB는 SQLite 파일이며 첫 실행 때 자동으로 만들어집니다.

### 실행

```bash
npm install
```

```bash
npm run dev
```

| 주소 | 내용 |
|---|---|
| http://localhost:5173 | 웹 화면 |
| http://localhost:3000/api/docs | API 문서 (Swagger) |
| http://localhost:3000/api/health | 상태 확인 (DB 연결 포함) |

`npm run dev`는 시작 전에 DB(`apps/api/prisma/dev.db`)를 만들고 마이그레이션과 데모 데이터를 적용합니다(`predev`). 다시 실행해도 데이터가 있으면 데모 데이터를 또 넣지 않습니다.

데모 데이터를 처음 상태로 되돌리려면 (모든 데이터 삭제):

```bash
npm run db:reset
```

### Docker로 실행

Node 22.12 이상이 없을 때의 대안입니다. 빌드 결과물을 실행하므로 코드 변경이 바로 반영되지는 않습니다.

```bash
docker compose up --build
```

| 주소 | 내용 |
|---|---|
| http://localhost:4173 | 웹 화면 |
| http://localhost:3000/api/docs | API 문서 |

DB는 `db-data` 볼륨에 저장되어 재시작해도 유지됩니다. 처음 상태로 되돌리려면 볼륨까지 지웁니다.

```bash
docker compose down -v
```

### 테스트

```bash
npm run verify
```

포맷 → 린트 → 타입 검사 → 단위 테스트(api 110, web 97) → e2e 테스트(103)를 순서대로 실행합니다. e2e는 전용 DB(`apps/api/prisma/test.db`)를 새로 만들어 쓰므로 개발 데이터에 영향이 없습니다.

### 둘러보기

첫 화면에서 역할을 고릅니다(로그인은 과제 조건에 따라 생략). 데모 데이터는 실행한 날짜를 기준으로 만들어지므로, 언제 실행해도 "운영 중"인 자습실이 있습니다.

| 데모 자습실 | 확인할 수 있는 것 |
|---|---|
| 수학 자습실 A (정원 5) | 신청, 시간 변경, 취소 |
| 영어 자습실 B (정원 2) | 학생 두 명이 신청하면 세 번째 학생에게 "정원 마감" |
| 국어 자습실 C | 운영 종료 → 신청 불가 |
| 과학 자습실 D | 삭제된 자습실 → 목록에 나오지 않음 |

추천 흐름 (과제 발문의 불만과 대응):

1. **학생**(김민준)으로 수학 자습실 A에 신청 → "내 신청"에서 시간 변경
   → *"8시로 바꾸려면 누구한테 말해요?"* 학생이 직접 바꾸고, 변경이 이력에 남습니다.
2. **강사**로 바꿔 수학 자습실 A 상세 → 신청자 목록과 이력(누가, 언제, 무엇을, 이전 → 이후)
3. 강사가 정원을 현재 신청 수보다 작게 줄여 저장 → **거부**되고, 취소할 수 있는 신청 목록이 함께 나옴 → 사유를 적어 취소한 뒤 다시 저장
4. 다시 **학생**(김민준)으로 → "내 신청"에 *"강사가 취소했습니다 / 사유"*
   → *"제가 명단에 있는 건지 모르겠어요"* 상태와 취소 사유를 학생이 직접 봅니다.

---

## 2. 기술 스택과 선택 이유

| 영역 | 선택 | 이유 |
|---|---|---|
| 모노레포 | **npm workspaces** | 평가자 PC에 pnpm·yarn이 없을 수 있습니다. Node만 있으면 되게 했습니다. |
| 공용 타입 | **`packages/shared`** (ESM) | FE는 에러를 `message`가 아니라 `code`로 분기합니다. 코드 목록을 양쪽에서 따로 적으면 오타가 런타임에야 드러나므로 한 곳에 두었습니다. |
| Backend | **NestJS 12** | 과제 필수. Guard(권한) → Pipe(검증) → Controller → Filter(에러 형식)의 요청 파이프라인을 프레임워크 규칙대로 나눴습니다. |
| DB | **SQLite + Prisma 7** | "README만 보고 한 번에 실행" 조건 때문에 설치가 필요 없는 파일 DB를 골랐습니다. JSON 파일 DB도 허용되지만, 정원·중복 신청은 **트랜잭션과 유니크 제약을 DB가 보장**해야 해서 SQL DB를 택했습니다. Prisma는 마이그레이션 파일을 남기고, SQLite 전용 문법 없이 작성하면 PostgreSQL로 옮길 때 provider만 바꾸면 됩니다. |
| 검증 | class-validator, 전역 `ValidationPipe` | `whitelist` + `forbidNonWhitelisted`로 DTO에 없는 필드(`activeCount` 등 서버 관리 값)를 조용히 버리지 않고 거부합니다. |
| API 문서 | @nestjs/swagger | 각 엔드포인트에 가능한 에러 코드를 함께 표시합니다. |
| Frontend | **Vue 3.5** (`<script setup>`) + Vite + TypeScript | 과제 필수. |
| 서버 상태 | **TanStack Query** | 강사와 학생이 같은 데이터를 바꾸는 서비스라 캐시 무효화가 핵심입니다. 로딩·에러·재시도·무효화를 직접 만들지 않았습니다. |
| 클라이언트 상태 | Pinia | 현재 역할과 선택한 학생만 둡니다. 서버 데이터를 Pinia에 복사하지 않습니다. |
| 스타일 | Tailwind CSS 4 | |
| 시간 | 서버 `Date` + `Clock` 추상화 / 화면 내장 `Intl` | 날짜 라이브러리를 넣지 않았습니다. 서버는 UTC 비교만 하고, 화면은 `Intl.DateTimeFormat`이 `Asia/Seoul`을 지원하며 KST는 일광절약시간이 없어 입력 변환도 고정 `+09:00`이면 됩니다. 대신 변환 함수 3개를 경계값 테스트로 지켰습니다. |
| 테스트 | **Vitest** (api는 SWC 변환) | Jest(CJS)는 ESM인 공용 패키지를 불러오지 못합니다. Vitest가 쓰는 esbuild는 데코레이터 메타데이터를 만들지 않아 Nest DI가 동작하지 않으므로, api만 `unplugin-swc`로 변환합니다. |

버전은 모두 정확히 고정했습니다(`.npmrc`의 `save-exact`, `package-lock.json` 커밋). npm `latest`가 RC를 가리키는 Prisma는 안정판 7.x로, 생태계(typescript-eslint, Nest CLI)가 아직 7을 지원하지 않는 TypeScript는 6.0.3으로 고정했습니다.

---

## 3. 아키텍처와 컨벤션

상세: [docs/architecture.md](./docs/architecture.md) · 작업 규칙 전체: [CLAUDE.md](./CLAUDE.md)

```
apps/
├── api/src/
│   ├── common/          # 요청자(Guard·데코레이터), Clock, 에러·필터, 검증, Swagger
│   ├── database/        # PrismaClient 팩토리, SQLite PRAGMA (SQLite 전용 코드는 여기에만)
│   └── modules/
│       ├── rooms/       # controller · service · policy · dto
│       ├── students/
│       └── visits/      # 신청·수정·취소, 이력, 시스템 취소(R8·R9)
└── web/src/
    ├── api/             # axios 인스턴스 하나 + 엔드포인트 함수
    ├── queries/         # TanStack Query 훅, query key
    ├── utils/           # 폼 검증, 충돌 해석, 일시 변환 (순수 함수)
    ├── components/
    └── pages/           # teacher/, student/
packages/shared/         # ErrorCode, 메시지, enum, 응답 타입
```

### 핵심 규칙

**1. 정원은 조건부 원자적 UPDATE로만 지킵니다.**
"COUNT 후 INSERT"는 두 요청이 동시에 오면 둘 다 빈자리를 보고 정원을 넘깁니다. 검사와 증가를 한 문장으로 합쳤습니다.

```ts
const { count } = await tx.studyRoom.updateMany({
  where: { id: roomId, deletedAt: null, activeCount: { lt: prisma.studyRoom.fields.maxPersonnel }, /* + 운영 기간 */ },
  data: { activeCount: { increment: 1 } },
});
if (count === 0) /* 이때만 원인을 진단해 ROOM_FULL 등을 던짐 */
```

신청의 상태 전이(취소, 시간 수정, 재신청)와 자습실 수정(정원 축소, 기간 변경)도 같은 방식입니다. 메모리 락은 서버가 두 대가 되면 깨지므로 쓰지 않았습니다.

**2. 비즈니스 규칙은 순수 함수(`*.policy.ts`)에 둡니다.**
서비스는 "조회 → 정책 → 저장"을 조율만 합니다. 정책은 Prisma와 Nest에 의존하지 않고 예외도 던지지 않으며 `PolicyResult`를 돌려줍니다. 덕분에 운영 기간 시작·끝 정각, 정원 `max-1`/`max` 같은 경계값을 DB 없이 테스트합니다.

**3. 시간은 `Clock`으로만 읽습니다.**
도메인 코드에서 `new Date()`를 부르지 않습니다. 테스트는 고정 시각을 주입해 "지난 방문", "운영 종료"를 결정적으로 검증합니다. 한 요청 안에서는 `now`를 한 번만 읽어 정책 판단과 이력 기록이 같은 시각을 씁니다.

**4. 요청자는 헤더로 받고 한 곳에서만 해석합니다.**
`X-Actor-Role`(`TEACHER` | `STUDENT`), `X-Student-Id`. 파싱은 `parseActor()`, 역할 검사는 `@Roles()` + 전역 `ActorGuard`입니다. Guard는 **기본 거부(fail-closed)**여서 `@Roles`나 `@Public` 선언을 빠뜨리면 아무도 호출할 수 없습니다(500). body가 아니라 헤더인 이유는, 요청자는 "무엇을 하라"(리소스 데이터)가 아니라 "누가 요청하는가"(인증 문맥)이기 때문입니다. 나중에 JWT로 바꿀 때 `parseActor()`만 교체하면 되고 DTO와 서비스는 그대로입니다. ([근거 상세](./docs/visit-policy.md#6-요청자-식별-왜-body가-아니라-헤더인가))

**5. 에러는 코드로 던지고, 형식은 필터 한 곳에서 정합니다.**

```json
{ "statusCode": 409, "code": "ROOM_FULL", "message": "자습실 정원이 가득 찼습니다.", "timestamp": "…", "details": { } }
```

서비스는 `DomainException(code)`만 던지고 HTTP 상태를 고르지 않습니다. 코드 → 상태 매핑은 `error-status.ts` 하나이며, `Record<ErrorCode, …>`라서 코드를 추가하고 매핑을 빠뜨리면 컴파일 에러가 납니다. 프론트는 `message`가 아니라 `code`로 분기합니다.

| HTTP | 의미 | 예 |
|---|---|---|
| 400 | 입력 형식 오류 | `VALIDATION_FAILED`, `CANCEL_REASON_REQUIRED` |
| 401 / 403 | 요청자 없음 / 권한 없음 | `ACTOR_REQUIRED` / `FORBIDDEN_ROLE`, `FORBIDDEN_VISIT_OWNER` |
| 404 | 없거나 삭제됨 | `ROOM_NOT_FOUND`, `VISIT_NOT_FOUND` |
| 409 | 현재 상태와 충돌 | `ROOM_FULL`, `DUPLICATE_VISIT`, `CAPACITY_BELOW_ACTIVE` |
| 422 | 형식은 맞지만 규칙 위반 | `VISIT_OUT_OF_PERIOD`, `VISIT_IN_PAST` |

**6. 프론트엔드는 계층을 건너뛰지 않습니다.**
`pages` → `queries`(TanStack Query) → `api` 함수 → `client.ts`(axios). 헤더 부착과 에러 변환(`ApiError`)은 `client.ts`에서만 합니다. 쓰기 후에는 영향을 받는 query key를 무효화하고, `staleTime`은 0으로 둬 화면을 열 때마다 최신 데이터를 받습니다.

### API

| 메서드 | 경로 | 역할 | 설명 |
|---|---|---|---|
| GET / POST | `/api/rooms` | 강사·학생 / 강사 | 자습실 목록, 등록 |
| GET / PATCH / DELETE | `/api/rooms/:id` | 강사·학생 / 강사 / 강사 | 상세, 수정(R6·R7), 삭제(R8) |
| POST | `/api/rooms/:roomId/visits` | 학생 | 방문 신청 (재신청 포함) |
| GET | `/api/rooms/:roomId/visits` | 강사 | 신청자 목록 |
| GET | `/api/rooms/:roomId/histories` | 강사 | 자습실 신청 이력 |
| PATCH | `/api/visits/:id` | 학생 | 방문 시간 수정 |
| POST | `/api/visits/:id/cancel` | 학생·강사 | 취소 (상태 전이라 DELETE가 아님, 강사는 사유 필수) |
| GET | `/api/me/visits` | 학생 | 내 신청 목록 (취소 주체·사유 포함) |
| GET / POST / PATCH / DELETE | `/api/students` | 강사 | 학생 관리 (삭제 시 R9) |
| GET | `/api/students/options` | 공개 | 역할 선택용 (id·이름만, 전화번호 제외) |
| GET | `/api/health` | 공개 | 상태 확인 |

정확한 요청·응답 형식과 엔드포인트별 에러 코드는 Swagger(`/api/docs`)에 있습니다.

### 작업 방식

- 기능은 [`issues/`](./issues/README.md)의 이슈 폴더 단위로 진행했습니다. 각 폴더에 목표, 완료 기준, **결정 기록(무엇을, 왜)**이 있고, 아래 "고민한 점"은 여기서 뽑았습니다.
- 이슈 1개 = 브랜치 1개 = PR 1개, Squash merge. `main`은 항상 실행 가능한 상태를 유지했습니다.
- 커밋 전 `npm run verify`(포맷·린트·타입·단위·e2e)를 통과시켰습니다.

---

## 4. DB 스키마와 설계 이유

ERD: [docs/erd.md](./docs/erd.md) · 스키마 원본: [`schema.prisma`](./apps/api/prisma/schema.prisma) · 정책 상세: [docs/visit-policy.md](./docs/visit-policy.md)

| 테이블 | 역할 | 핵심 |
|---|---|---|
| `students` | 학생 | Soft Delete(`deletedAt`) |
| `study_rooms` | 자습실 | `maxPersonnel`, `startDate`~`endDate`, **`activeCount`(비정규화 카운터)**, Soft Delete |
| `visits` | 신청의 **현재 상태** | `UNIQUE(roomId, studentId)`, `status`(ACTIVE / CANCELED), `visitAt` |
| `visit_histories` | 신청의 **변경 이력** (append-only) | `action`, `actorType`(학생·강사·시스템), `prevVisitAt` → `nextVisitAt`, `reason` |

### 왜 이렇게 설계했나

**`Visit`(현재 상태)과 `VisitHistory`(이력)를 나눴습니다.**
- 이력만 저장하고 상태를 계산하면(이벤트 소싱) 정원 검사·목록 조회마다 재계산해야 해 MVP에 과합니다.
- `Visit`에 이력 컬럼을 붙이면 여러 번 수정된 경우를 표현할 수 없습니다.
- 그래서 조회는 `Visit`, 감사는 `VisitHistory`가 맡고, 둘은 **항상 같은 트랜잭션**에서 바뀝니다.
- 이력에 이전·이후 값이 있어 이력만 재생하면 현재 신청이 나와야 하며, 테스트가 이를 확인합니다.

**`UNIQUE(roomId, studentId)` + 취소 후 재신청은 같은 행을 다시 활성화합니다.**
- 대안은 "취소 행은 남기고 새 행 + `WHERE status='ACTIVE'` 부분 유니크 인덱스"입니다. 하지만 Prisma 스키마로는 부분 인덱스를 표현할 수 없어 손으로 고친 SQL 마이그레이션이 필요합니다.
- 재활성화 방식은 표준 유니크 제약만으로 "자습실당 학생의 활성 신청 1건"을 DB가 보장합니다.
- 취소·재신청의 흔적은 이력(`CANCELED` → `REAPPLIED`)에 남습니다.

**`activeCount` 비정규화 카운터를 뒀습니다.**
- `UPDATE … WHERE activeCount < maxPersonnel` 한 문장으로 정원 검사와 증가를 원자적으로 끝내기 위해서입니다. 별도 락 없이 PostgreSQL에서도 그대로 동작합니다.
- 카운터를 바꾸는 곳은 신청 서비스와 삭제 처리 두 곳으로 제한했습니다.
- 테스트는 상태가 바뀔 때마다 카운터와 실제 ACTIVE 수가 같은지 확인합니다.

**학생·자습실은 Soft Delete만, 모든 FK는 `ON DELETE RESTRICT`입니다.**
- 신청 이력은 누가 언제 무엇을 했는지의 기록이므로 원본이 사라지면 안 됩니다.
- 실수로 물리 삭제를 시도하면 DB가 막습니다.

**"지난 방문"은 상태로 저장하지 않습니다.**
- `visitAt < now`인 ACTIVE 신청을 조회 시점에 계산합니다(R5). 배치 작업 없이 항상 정확합니다.
- 지난 방문은 정원을 계속 차지하고, 누구도 수정·취소할 수 없습니다.

**이력에 `roomId`, `studentId`를 중복 저장했습니다.**
- 자습실 상세 이력을 JOIN 없이 `(roomId, createdAt)` 인덱스로 조회하기 위해서입니다.
- 이력은 불변이라 비정규화로 인한 불일치가 생기지 않습니다.

**DB에 CHECK 제약(`maxPersonnel > 0`, `start < end`)은 두지 않았습니다.**
- Prisma 스키마가 CHECK를 지원하지 않습니다. SQLite는 컬럼 변경 시 테이블을 재생성하므로, 손으로 넣은 CHECK를 이후 마이그레이션이 지울 수 있습니다.
- 대신 DTO 검증과 정책 함수로 보장하고 테스트합니다.

**시간은 DB에 UTC로 저장하고, API는 ISO 8601(시간대 필수), 화면은 KST로 표시합니다(R10).**
- 시간대 없는 입력(`2026-11-20T19:00:00`)은 서버 시간대로 해석되어 9시간 어긋날 수 있어 거부합니다.

---

## 5. 고민한 점

과제 문서가 정하지 않은 부분은 [12개 정책(R1~R12)](./CLAUDE.md#5-도메인-정책-규칙-해석)으로 확정했습니다. 원칙은 두 가지였습니다.

- **데이터를 조용히 바꾸지 않는다.**
- **이미 일어난 일은 바꾸지 않는다.**

### 강사가 정원을 줄이거나 기간을 바꿨는데, 이미 신청한 학생이 있다면?

가능한 선택지는 셋이었습니다.

1. 초과분을 자동 취소 (누구를? 늦게 신청한 순? 학생은 왜 취소됐는지 모릅니다)
2. 그냥 허용 (정원 < 신청 수인 불가능한 상태가 생깁니다)
3. **거부하고 이유를 알려줌**

3을 택했습니다(R6, R7). 409 응답의 `details`에 충돌하는 신청 목록을 담고, 화면은 이를 해결 방법과 함께 보여줍니다. 강사가 신청을 골라 **사유와 함께 취소**(R11)한 뒤 다시 저장하면 됩니다. 학생은 "내 신청"에서 "강사가 취소했습니다 / 사유"를 봅니다.

삭제처럼 강사의 의도가 명시적일 때만 시스템이 예정 신청을 취소하고, 이를 `SYSTEM_CANCELED` 이력으로 남깁니다(R8, R9). 지난 방문은 실제로 일어난 일이므로 기록으로 남깁니다.

### "검사 후 UPDATE"를 믿지 않기

자습실 수정에서 "활성 신청 수 확인 → UPDATE"는 그 사이에 들어온 신청을 놓칩니다. 그래서 정원 조건과 `NOT EXISTS(새 기간 밖 신청)` 조건을 UPDATE 한 문장에 걸었습니다. Prisma가 정말 한 문장으로 실행하는지는 추측하지 않고 **SQL 로그로 확인**했습니다.

대부분의 수정은 충돌이 없으므로, 충돌 목록은 UPDATE가 0건일 때만 읽습니다. 매 요청에 조회 비용을 붙이지 않습니다.

### 시간 수정이 자습실의 수정 시각을 바꾸는 문제

처음에는 모든 신청 쓰기가 자습실 행을 함께 갱신해 직렬화 지점으로 쓰려 했습니다. 그런데 Prisma는 행을 갱신하면 `updatedAt`을 자동으로 바꿔, 학생이 시간만 바꿔도 "자습실이 수정됨"으로 보이게 됩니다. 계획을 바꿔 신청 행 UPDATE에 관계 필터(자습실이 삭제되지 않았고 새 시각이 기간 안)를 걸었습니다.

같은 신청에 시간 수정이 동시에 두 번 오면 늦은 쪽 이력의 "이전 값"이 틀어지므로, "읽은 시각 그대로"를 조건에 넣어 막았습니다.

### 테스트가 증명하는 것과 증명하지 못하는 것

- 동시 신청 e2e(10명 → 정원만큼만 성공)를 15회 반복 실행해 모두 통과했습니다.
- 하지만 better-sqlite3는 연결이 하나라 트랜잭션이 사실상 차례로 실행됩니다. 이 테스트만으로는 "조건부 UPDATE가 없었다면 깨졌을 것"까지 증명하지 못합니다.
- 그래서 트랜잭션 없이 동시 UPDATE를 보내는 DB 테스트를 따로 두어 원자성을 증명합니다. 두 테스트의 역할을 문서에 구분해 남겼습니다.

### 직접 화면을 보고서야 찾은 문제들

단위·컴포넌트 테스트를 통과한 뒤에도, PR마다 실제 API에 붙여 브라우저로 흐름을 확인했습니다. 여기서 세 가지를 찾았습니다.

- **강사가 취소했는데 학생 화면에는 30초간 "예정"으로 보임** → `staleTime` 30초 때문이었습니다. 여러 사람이 같은 데이터를 바꾸는 서비스라 요청 수보다 최신성이 중요하다고 판단해 0으로 바꿨습니다.
- **자습실 삭제 후 목록에 그 자습실이 잠깐 남음** → 상세 화면에 있는 동안 목록 query가 비활성이라, 무효화만으로는 옛 캐시가 먼저 보였습니다. 목록 캐시에서 즉시 빼고, 상세 캐시를 지웠습니다.
- **"강사이(가) 취소했습니다"** → 조사를 기계적으로 붙인 탓이었습니다. 주체별 문장을 정했습니다.

브라우저 테스트(Playwright)를 저장소에 넣지 않은 이유도 있습니다. 넣으면 평가자 환경에 브라우저 설치가 필요해져 "한 번에 실행" 조건이 무거워집니다. 핵심 흐름은 컴포넌트 테스트로 고정했습니다.

### 그 밖의 작은 판단들

- **취소는 `DELETE`가 아니라 `POST /visits/:id/cancel`**: 리소스가 사라지는 게 아니라 상태가 바뀌고, 기록과 이력이 남습니다.
- **강사의 공백뿐인 사유는 사유 없음**: `@IsNotEmpty`는 `"   "`를 통과시켜 학생 화면에 빈 사유가 보이게 됩니다. 앞뒤 공백을 지워 판단합니다.
- **역할 선택 화면용 공개 API는 id·이름만**: 이 화면에서는 아직 요청자가 없습니다. 학생 목록 전체를 공개하면 전화번호가 노출되고, 강사 헤더로 조회하면 역할 구분을 스스로 우회하게 됩니다.
- **같은 시각으로 수정하면 아무것도 하지 않음(R12)**: 의미 없는 이력이 쌓이지 않게 합니다.
- **버튼 활성 여부는 "고른 id"가 아니라 "실제로 찾은 대상"으로 판단**: 컴포넌트 테스트를 쓰다가, 눌러도 반응 없는 활성 버튼이 생기는 결함을 찾아 고쳤습니다.

이슈별 전체 결정 기록은 [`issues/`](./issues/README.md)에 있습니다.

---

## 6. 알려진 한계

- **헤더는 보안 장치가 아닙니다.** 누구나 `X-Actor-Role: TEACHER`를 보낼 수 있습니다. 과제가 로그인 생략을 허용한 데 따른 한계입니다. 대신 요청자 해석을 `parseActor()` 한 곳에 모아, 인증을 붙일 때 그 함수만 JWT 검증으로 바꾸면 되게 했습니다.
- **SQLite는 쓰기를 DB 단위로 직렬화합니다.** 동시 쓰기가 많은 운영 환경에서는 PostgreSQL로 전환해야 합니다.
  - Prisma API만 썼으므로 코드 대부분은 그대로입니다. SQLite 전용 코드는 `src/database/`의 PRAGMA 한 곳입니다.
  - 단, 자습실 수정의 `NOT EXISTS` 조건은 PostgreSQL 기본 격리 수준에서 동시 커밋을 못 볼 수 있습니다. 자습실 행을 먼저 잠그는 방식(`SELECT … FOR UPDATE`)으로 바꿔야 합니다([상세](./docs/architecture.md#3-동시성-설계)).
- **페이지네이션이 없습니다.** 자습실·이력 수가 강사 한 명 규모(수십~수백 건)라고 보았습니다. 늘어나면 `(roomId, createdAt)` 인덱스를 이용한 커서 방식으로 추가합니다.
- **Docker 구성의 웹 서버(`vite preview`)는 운영용이 아닙니다.** 실제 배포에서는 정적 파일을 nginx·CDN이 서빙하고 `/api`만 API 서버로 보내는 리버스 프록시를 둡니다.
- **`npm install` 끝에 `npm audit` 경고(moderate 12건)가 나옵니다.**
  - 모두 개발 도구(ESLint 플러그인, 테스트 유틸)가 쓰는 `minimatch`·`glob` 경로입니다. 운영 의존성은 0건입니다(`npm audit --omit=dev`).
  - 제안된 `npm audit fix --force`는 typescript-eslint를 8.72 → 8.36으로 **내리는** 변경이라, 고정한 TypeScript 6과의 호환을 깨뜨릴 수 있어 적용하지 않았습니다.
