# ISSUE-003: 공통 인프라

| 항목 | 내용 |
|---|---|
| 상태 | DONE |
| 관련 FR | 전체 API의 기반 |
| 관련 정책 | CLAUDE.md 7절(Clock, 요청자 식별), 8절(에러 형식), docs/visit-policy.md 6절 |
| 선행 이슈 | ISSUE-002 |

## 목표

이후 모든 API가 따르는 공통 동작을 한 번에 갖춘다. 서비스는 비즈니스 규칙에만 집중하고, 에러 형식·요청자 식별·입력 검증·시각은 인프라가 일관되게 처리한다.

## 범위

- 포함
  - `packages/shared`: `ERROR_CODE`, `ERROR_MESSAGE`, `ErrorResponse`, `FieldError`, `ACTOR_ROLE`, `ACTOR_HEADER`, `Actor`
  - `DomainException` + 코드 → HTTP 상태 매핑
  - 전역 예외 필터 (`AllExceptionsFilter`)
  - 전역 검증 Pipe, `ParseIdPipe`
  - `Clock`, `SystemClock`, `FixedClock`
  - 요청자 식별: `parseActor()`, 전역 `ActorGuard`, `@Roles`, `@Public`, `@CurrentActor`
  - Swagger (`/api/docs`, `/api/docs-json`)
  - health를 새 규칙(@Public, Clock, DomainException)에 맞게 수정
- 제외 (다른 이슈로)
  - 실제 도메인 API → ISSUE-004~008
  - FE의 에러 처리·헤더 주입(axios 인터셉터) → ISSUE-009

## 완료 기준

- [x] 모든 에러 응답이 `{ statusCode, code, message, timestamp, details? }` 형식 (e2e)
- [x] 헤더 없음·형식 오류 → 401 `ACTOR_REQUIRED`, 역할 불일치 → 403 `FORBIDDEN_ROLE` (단위·e2e)
- [x] **학생이 강사 전용 API에 잘못된 body를 보내면 400이 아니라 403** (Guard가 Pipe보다 먼저, e2e)
- [x] `@Roles`·`@Public` 선언이 없는 엔드포인트는 500으로 막힘 (기본 거부, 단위·e2e)
- [x] DTO에 없는 필드, 문자열 숫자, 깨진 JSON → 400 `VALIDATION_FAILED` (e2e)
- [x] 예상하지 못한 오류 → 500, 내부 메시지 미노출 (e2e)
- [x] 없는 경로 → 404 `ROUTE_NOT_FOUND` (e2e)
- [x] 모든 `ErrorCode`가 HTTP 상태와 메시지를 가짐 (컴파일 타임 + 단위)
- [x] Swagger 문서에 요청자 헤더가 전역 파라미터로 노출 (e2e)
- [x] `npm run verify` 통과, 개발 서버에서 Swagger UI·에러 형식 확인
- [x] CLAUDE.md 3·7·8·9절 갱신

## 설계 메모

요청 처리 순서와 각 단계의 책임:

```
요청 ─▶ ActorGuard ─▶ ValidationPipe ─▶ Controller ─▶ Service
         │ 401/403        │ 400               (@CurrentActor)   │ DomainException
         ▼                ▼                                     ▼
       ┌──────────────── AllExceptionsFilter ──────────────────────┐
       │ DomainException → 코드의 상태·메시지·details              │
       │ HttpException(프레임워크) → 상태 유지, 우리 코드로 변환  │
       │ 그 외 → 500 INTERNAL_ERROR (원인은 로그에만)              │
       └───────────────────────────────────────────────────────────┘
                                ▼
           { statusCode, code, message, timestamp, details? }
```

```
apps/api/src/common/
├── actor/        parse-actor.ts, actor.guard.ts, actor.decorators.ts, actor-request.ts
├── clock/        clock.ts(추상 클래스 = DI 토큰), system-clock.ts, fixed-clock.ts
├── errors/       domain.exception.ts, error-status.ts
├── filters/      all-exceptions.filter.ts
├── validation/   create-validation-pipe.ts, flatten-validation-errors.ts, parse-id.pipe.ts
├── swagger/      setup-swagger.ts
└── common.module.ts (@Global: Clock, AllExceptionsFilter)
```

## 작업 체크리스트

- [x] shared 에러·요청자 타입
- [x] DomainException, 상태 매핑
- [x] 예외 필터
- [x] 검증 Pipe, ParseIdPipe
- [x] Clock
- [x] 요청자 Guard·데코레이터
- [x] Swagger
- [x] health 수정
- [x] 단위 테스트 54, e2e 26
- [x] 문서

## 결정 기록 (Decision Log)

| 날짜 | 결정 | 이유 / 검토한 대안 |
|---|---|---|
| 2026-11-15 | **`DomainException`은 `HttpException`을 상속하지 않음** | 상속하면 호출하는 쪽이 HTTP 상태를 직접 고를 수 있어 같은 코드가 다른 상태로 나갈 수 있다. 상태는 `error-status.ts`의 매핑으로만 정해지게 했다. |
| 2026-11-15 | **코드 → 상태 매핑은 api에, 코드·메시지는 shared에** | FE는 코드로 분기하고 메시지를 보여줄 뿐 HTTP 상태 매핑이 필요 없다. 서버 관심사를 shared에 섞지 않았다. 두 매핑 모두 `Record<ErrorCode, …>`라 코드를 추가하고 빠뜨리면 컴파일 에러가 난다. |
| 2026-11-15 | **`ActorGuard`를 기본 거부(fail-closed)로** | `@Roles` 선언을 깜빡하면 "아무나 호출 가능"이 아니라 "아무도 호출 불가(500)"가 된다. 권한 버그는 열려 있는 쪽보다 닫혀 있는 쪽이 안전하고, 500은 개발 중에 바로 드러난다. |
| 2026-11-15 | **Guard는 DB를 조회하지 않음** | 학생 id가 실제로 존재하는지(삭제 여부)는 확인하지 않는다. 모든 요청에 DB 조회가 붙고, 존재 확인은 어차피 각 서비스가 대상 데이터를 읽으며 한다. 없는 학생이면 서비스가 404 `STUDENT_NOT_FOUND`를 반환한다. |
| 2026-11-15 | **강사 요청에 함께 온 `X-Student-Id`는 무시** | FE가 역할을 바꾼 직후 이전 학생 id를 보낼 수 있고, 강사 요청의 의미에 영향이 없다. 거부하면 사용자에게 이해하기 어려운 401이 나간다. |
| 2026-11-15 | **같은 헤더가 여러 번 오면 거부** | 어느 값을 믿을지 정할 근거가 없다. |
| 2026-11-15 | **`Clock`은 인터페이스가 아니라 추상 클래스** | TypeScript 인터페이스는 런타임에 사라져 Nest DI 토큰으로 쓸 수 없다. 추상 클래스는 타입이자 토큰이라 `constructor(private clock: Clock)`만으로 주입된다. |
| 2026-11-15 | **암묵적 타입 변환(`enableImplicitConversion`) 끔** | 켜면 `"abc"`가 `NaN`이 되어 숫자 검증을 통과하는 등 예측하기 어렵다. JSON body는 이미 타입이 있고, 경로 파라미터는 `ParseIdPipe`로 명시적으로 바꾼다. |
| 2026-11-15 | **`forbidNonWhitelisted` 켬** | DTO에 없는 필드(`activeCount` 등 서버 관리 필드)를 조용히 버리지 않고 거부한다. 클라이언트 버그를 빨리 드러낸다. |
| 2026-11-15 | **자체 `ParseIdPipe`** | Nest `ParseIntPipe`는 `HttpException`을 던져 에러 형식이 달라지고, `0`·`-1`을 통과시킨다. |
| 2026-11-15 | **프레임워크 `HttpException`은 상태 유지 + 코드 변환** | 깨진 JSON(400), 없는 경로(404)도 같은 응답 형식이어야 FE가 한 가지 방식으로 처리할 수 있다. |
| 2026-11-15 | **dayjs 도입 보류** | 서버는 UTC `Date` 비교만 한다. 쓰지 않는 의존성을 미리 넣지 않고, KST 표시가 필요한 화면 작업(ISSUE-009)에서 결정한다. CLAUDE.md 3절을 이에 맞게 고쳤다. |
| 2026-11-15 | **e2e 검증용 컨트롤러는 테스트 파일 안에만** | 실제 도메인 API가 생기기 전에 공통 동작을 검증해야 한다. 운영 코드에 테스트용 엔드포인트를 남기지 않기 위해 `Test.createTestingModule({ controllers: [ProbeController] })`로 테스트에서만 등록했다. |
