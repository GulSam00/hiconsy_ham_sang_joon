# CLAUDE.md

하이컨시 과제 전형 **지정 주제 1: 자습실 예약 MVP** 저장소입니다.
이 문서는 AI 도구와 개발자가 따르는 **작업 규칙**만 담습니다. 설계 근거와 상세 설명은 `docs/`와 각 이슈 폴더에 둡니다.

## 1. 프로젝트 개요

- 강사는 자습실(최대 인원, 운영 기간)을 등록·수정·삭제하고, 학생은 방문을 신청·수정·취소합니다.
- 평가 기준은 **구현한 부분의 품질, 의도, 고민**입니다. 기능 수보다 완성도가 우선입니다.
- **평가자 로컬에서 README만 보고 한 번에 실행**돼야 합니다. 외부 서비스나 별도 DB 설치에 의존하지 않습니다.
- 필수 스택: Vue 3, NestJS. 로그인은 생략하고 화면에서 강사/학생 역할을 선택합니다.

## 2. 작업 방식: 이슈 폴더

모든 기능 작업은 `issues/` 아래의 **이슈 폴더 단위**로 관리합니다.

```
issues/
├── README.md                     # 이슈 목록과 상태 (인덱스)
├── _template/README.md           # 새 이슈 템플릿
└── 004-room-crud-api/
    └── README.md                 # 목표, 관련 FR, 완료 기준, 설계 메모, 체크리스트, 결정 기록
```

- 폴더 이름: `{3자리 번호}-{kebab-case 요약}` (예: `006-visit-api`)
- 작업 시작 전: `_template`을 복사해 이슈 폴더를 만들고, `issues/README.md`의 상태를 `IN_PROGRESS`로 바꿉니다.
- 작업 중: 설계상 판단이 필요했던 지점은 이슈의 **결정 기록(Decision Log)**에 "무엇을, 왜"로 남깁니다. README의 "고민했던 점" 섹션이 여기서 나옵니다.
- 작업 완료: 완료 기준 체크리스트를 모두 채우고, 인덱스 상태를 `DONE`으로 바꿉니다.
- 한 번에 **하나의 이슈**만 진행합니다. 범위 밖의 발견 사항은 새 이슈로 추가하고 현재 작업에 섞지 않습니다.
- 코드는 이슈 폴더가 아니라 `apps/`, `packages/`에 둡니다. 이슈 폴더에는 문서만 둡니다.

## 3. 기술 스택

| 영역 | 선택 | 비고 |
|---|---|---|
| 모노레포 | npm workspaces | 평가자 PC에 pnpm이 없을 수 있음 |
| Backend | NestJS | `apps/api` |
| DB | **SQLite + Prisma ORM** | 파일 DB라서 별도 설치 불필요. 트랜잭션·유니크 제약을 DB가 보장 |
| 검증 | class-validator, class-transformer, 전역 `ValidationPipe` | `whitelist`, `forbidNonWhitelisted`, `transform` 켬 |
| API 문서 | @nestjs/swagger | `/api/docs` |
| 시간 | dayjs (+utc, timezone) | |
| Frontend | Vue 3 + Vite + TypeScript | `apps/web` |
| 서버 상태 | @tanstack/vue-query | |
| 클라이언트 상태 | Pinia | 현재 역할, 선택한 학생만 보관 |
| 스타일 | Tailwind CSS | |
| 공용 타입 | `packages/shared` | `ErrorCode`, enum, API 응답 타입 |

### 버전 고정 규칙

- 의존성은 **정확한 버전으로 고정**합니다 (`^`, `~` 금지). `package-lock.json`을 커밋합니다.
- **Prisma**: npm `latest` 태그가 RC(8.x)를 가리키므로 **안정판 7.x를 명시 고정**합니다. RC, beta, dev 태그는 쓰지 않습니다.
- **TypeScript**: NestJS 데코레이터 메타데이터와 호환되는 버전을 씁니다. 메이저 버전을 올리기 전에 `api` 빌드와 테스트 통과를 확인합니다.

## 4. 명령어

> ISSUE-001(프로젝트 셋업)에서 확정합니다. 스크립트를 추가·변경하면 이 표도 함께 갱신합니다.

| 목적 | 명령 |
|---|---|
| 설치 | `npm install` |
| DB 마이그레이션 + 시드 | `npm run db:setup` |
| 개발 서버 (api + web) | `npm run dev` |
| 테스트 전체 | `npm test` |
| 린트 / 타입 검사 | `npm run lint` / `npm run typecheck` |

## 5. 도메인 정책 (규칙 해석)

과제 문서가 모호한 부분은 아래로 확정합니다. 정책을 바꾸면 **이 표, `docs/`, 관련 테스트를 함께** 수정합니다.

| # | 항목 | 정책 |
|---|---|---|
| R1 | 정원 | 자습실별 **활성(ACTIVE) 신청 총수** ≤ `maxPersonnel`. 시간대별 정원이 아님 |
| R2 | 방문 시간 | 단일 시점 `visitAt` |
| R3 | 중복 신청 | (자습실, 학생)당 신청 레코드 1개. **취소 후 재신청은 허용**하며 같은 레코드를 다시 활성화함 |
| R4 | 운영 기간 | `startDate ≤ visitAt ≤ endDate` (양 끝 포함). 현재 시각 이전은 신청·수정 불가 |
| R5 | 지난 방문 | `visitAt`이 지난 신청은 수정·취소 불가 |
| R6 | 정원 축소 | 새 `maxPersonnel`이 현재 활성 신청 수보다 작으면 **거부(409)** |
| R7 | 기간 변경 | 변경된 기간 밖으로 밀려나는 활성 신청이 있으면 **거부(409)** 하고 해당 신청 목록을 응답에 포함 |
| R8 | 자습실 삭제 | Soft Delete 허용. 활성 신청은 같은 트랜잭션에서 **시스템 취소**(`SYSTEM_CANCELED`, actor `SYSTEM`) |
| R9 | 학생 삭제 | Soft Delete 허용. 활성 신청은 R8과 같은 방식으로 시스템 취소 |
| R10 | 시간대 | DB에는 UTC로 저장, API는 ISO 8601(UTC), 화면은 KST로 표시 |

원칙: **데이터를 조용히 바꾸지 않는다.** 강사의 수정이 학생 신청과 충돌하면 거부하고 이유를 알려줍니다. 삭제처럼 명시적 의도가 있을 때만 시스템이 신청을 취소하고, 그 사실을 이력에 남깁니다.

## 6. 데이터 모델 규칙

- 모델: `Student`, `StudyRoom`, `Visit`(현재 상태), `VisitHistory`(변경 이력).
- `Student`, `StudyRoom`은 **Soft Delete**(`deletedAt`)만 합니다. 물리 삭제 금지. 조회 시 항상 `deletedAt: null` 조건을 붙입니다.
- `Visit`은 `@@unique([roomId, studentId])`로 중복 신청을 **DB 레벨에서** 막습니다.
- `VisitHistory`는 **append-only**입니다. INSERT만 하고 UPDATE·DELETE는 하지 않습니다.
- **Visit 상태 변경과 VisitHistory INSERT는 반드시 같은 트랜잭션**에서 수행합니다.
- `StudyRoom.activeCount`(비정규화 카운터)는 **`VisitsService`(와 R8 삭제 처리)에서만** 변경합니다. 다른 곳에서 직접 수정하지 않습니다.
- 스키마를 바꾸면 마이그레이션 파일을 생성해 커밋하고, `docs/`의 ERD를 갱신합니다.

### SQLite 운영 규칙

- DB 파일은 `apps/api/prisma/dev.db`이고 **커밋하지 않습니다** (`.gitignore`). 시드로 재생성합니다.
- 연결 시 **WAL 모드**와 `busy_timeout`을 설정해 동시 쓰기 시 `SQLITE_BUSY`를 줄입니다.
- SQLite는 쓰기를 DB 단위로 직렬화합니다. 이 한계와 "운영 환경에서는 PostgreSQL로 전환" 방침을 README에 명시합니다.
- SQLite 전용 문법이나 raw SQL을 쓰지 않습니다. PostgreSQL로 옮겨도 그대로 동작하게 Prisma API만 사용합니다.

## 7. 핵심 구현 규칙

### 정원 검사는 조건부 원자적 UPDATE로만

"COUNT 후 INSERT"는 경합 시 정원을 초과하므로 **금지**합니다. 아래 패턴만 사용합니다.

```ts
const { count } = await tx.studyRoom.updateMany({
  where: {
    id: roomId,
    deletedAt: null,
    activeCount: { lt: this.prisma.studyRoom.fields.maxPersonnel },
  },
  data: { activeCount: { increment: 1 } },
});
if (count === 0) throw new DomainException(ErrorCode.ROOM_FULL);
```

- 취소 시 감소는 `status === ACTIVE`인 경우에만 수행해 카운터가 음수가 되지 않게 합니다.
- 메모리 뮤텍스(`async-mutex` 등)로 정원을 지키지 않습니다. 서버가 여러 대가 되면 깨집니다.

### 시간은 Clock으로

- 도메인 로직에서 `new Date()`, `Date.now()`를 직접 호출하지 않습니다. `Clock`을 주입받아 `clock.now()`를 씁니다.
- 테스트에서는 고정 시각 Clock을 주입합니다.

### 비즈니스 규칙은 순수 함수로

- 검증 규칙(R1~R7)은 `modules/*/*.policy.ts`의 **순수 함수**로 작성합니다. Prisma, Nest에 의존하지 않습니다.
- 서비스는 "데이터 조회 → policy 호출 → 저장"을 조율만 합니다.

### 요청자 식별

- 로그인은 없지만, 학생 요청은 `X-Student-Id` 헤더와 `@CurrentStudent()` 데코레이터로 요청자를 식별합니다.
- 본인 신청이 아니면 `403 FORBIDDEN_VISIT_OWNER`를 반환합니다.
- 나중에 JWT로 바꿀 때 Guard와 데코레이터만 교체하면 되도록, 컨트롤러·서비스가 헤더를 직접 읽지 않습니다.

## 8. API 컨벤션

- REST 리소스 경로는 복수형 kebab-case입니다 (`/rooms`, `/rooms/:id/visits`, `/me/visits`).
- 삭제가 아닌 **상태 전이는 `POST /{resource}/:id/{action}`**으로 표현합니다 (예: `POST /visits/:id/cancel`). 취소는 리소스 삭제가 아닙니다.
- 부분 수정은 `PATCH`를 씁니다.
- 에러는 `DomainException(ErrorCode.X)`로 던지고, 전역 Exception Filter가 아래 형식으로 변환합니다. 컨트롤러에서 `HttpException`을 직접 만들지 않습니다.

```json
{ "statusCode": 409, "code": "ROOM_FULL", "message": "자습실 정원이 가득 찼습니다.", "timestamp": "2026-11-15T03:00:00.000Z" }
```

| HTTP | 용도 | 예시 code |
|---|---|---|
| 400 | DTO 검증 실패 | `VALIDATION_FAILED` |
| 403 | 권한 없음 | `FORBIDDEN_VISIT_OWNER` |
| 404 | 없거나 삭제됨 | `ROOM_NOT_FOUND`, `STUDENT_NOT_FOUND`, `VISIT_NOT_FOUND` |
| 409 | 현재 상태와 충돌 | `ROOM_FULL`, `DUPLICATE_VISIT`, `VISIT_ALREADY_CANCELED`, `VISIT_ALREADY_PASSED`, `CAPACITY_BELOW_ACTIVE`, `PERIOD_EXCLUDES_VISITS` |
| 422 | 형식은 맞지만 규칙 위반 | `VISIT_OUT_OF_PERIOD`, `VISIT_IN_PAST`, `INVALID_PERIOD` |

- `ErrorCode`는 `packages/shared`에 정의하고 FE·BE가 함께 씁니다. 새 코드를 추가하면 메시지 매핑도 함께 추가합니다.
- Prisma 유니크 위반(`P2002`)은 서비스에서 해당 도메인 에러(예: `DUPLICATE_VISIT`)로 변환합니다. Prisma 에러가 응답에 그대로 노출되면 안 됩니다.
- 프론트는 `message`가 아니라 **`code`로 분기**합니다.

## 9. 코드 컨벤션

### 공통 (TypeScript)

- `strict: true`. **`any` 금지**입니다. 모르는 값은 `unknown`으로 받고 타입 가드로 좁힙니다.
- `catch (error: unknown)`으로 받고, 처리할 수 없는 에러는 다시 던집니다. 에러를 삼키지 않습니다.
- "나중에 처리" 같은 TODO 주석으로 에러 처리를 미루지 않습니다.
- 매직 넘버·문자열 대신 상수나 enum을 씁니다.
- 주석은 "무엇"이 아니라 **"왜"**를 씁니다.

### Backend (NestJS)

- 파일명: `kebab-case.{role}.ts` (예: `visits.service.ts`, `create-room.dto.ts`, `visit.policy.ts`).
- 모듈 구조: `modules/{domain}/` 아래에 controller, service, policy, `dto/`.
- 요청 DTO는 `Create*Dto` / `Update*Dto`, 응답 DTO는 `*ResponseDto`. 엔티티를 그대로 응답하지 않고 응답 DTO로 변환합니다.
- 공통 요소는 `src/common/`(clock, errors, filters, decorators)에 둡니다.

### Frontend (Vue)

- `<script setup lang="ts">` + Composition API만 씁니다. Options API 금지.
- 컴포넌트 파일은 PascalCase (`RoomCard.vue`), 컴포저블은 `useXxx.ts`.
- 서버 데이터는 **TanStack Query로만** 다룹니다. Pinia에 서버 데이터를 복사하지 않습니다.
- Query key는 `src/queries/keys.ts`에서 한 곳에 정의합니다. mutation 성공 후 관련 key를 `invalidateQueries`로 무효화합니다.
- API 호출은 `src/api/`의 함수로만 합니다. 컴포넌트에서 axios를 직접 호출하지 않습니다.

## 10. 테스트 규칙

- `*.policy.ts`는 **경계값 단위 테스트**를 반드시 작성합니다 (운영 기간 시작·끝 정각, 정원 = max - 1 / max 등).
- 정원 동시성은 **e2e 테스트**로 검증합니다. 같은 자습실에 동시 신청 N건을 보내고 활성 신청 수 ≤ `maxPersonnel`, `activeCount`와 실제 ACTIVE 수가 일치하는지 확인합니다.
- 시간 의존 테스트는 고정 Clock을 씁니다.
- 테스트를 건너뛰거나(`skip`) 지워서 통과시키지 않습니다.

## 11. Git

- 커밋 메시지는 **Conventional Commits** 형식이고, 끝에 이슈 번호를 붙입니다.
  - `feat(visits): 방문 신청 API 구현 (ISSUE-006)`
  - type: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`
  - scope: `api`, `web`, `shared`, `rooms`, `students`, `visits`, `db`, `issues` 등
- `#번호` 표기는 GitHub 이슈 링크로 오인되므로 `ISSUE-xxx`를 씁니다.
- 한 커밋에는 하나의 논리적 변경만 담습니다. 커밋 전에 `lint`, `typecheck`, `test`를 통과시킵니다.
- `.env`, `*.db`, `node_modules`, 빌드 산출물은 커밋하지 않습니다.

## 12. 문서

- `README.md`: 실행 방법, 기술 스택과 선택 이유, 아키텍처와 컨벤션, DB 스키마와 설계 이유, 고민한 점 (과제 필수 항목).
- `docs/`: 정책 상세, 아키텍처, ERD(Mermaid).
- 정책·스키마·명령어가 바뀌면 이 문서와 README, `docs/`를 **같은 커밋에서** 갱신합니다.
