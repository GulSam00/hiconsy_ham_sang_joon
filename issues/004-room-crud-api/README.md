# ISSUE-004: 자습실 CRUD API

| 항목 | 내용 |
|---|---|
| 상태 | DONE |
| 관련 FR | FR-ROM-01, 02, 04, 05, (선택) FR-ROM-06 일부 |
| 관련 정책 | R4, R5, R6, R7, R8, R10 |
| 선행 이슈 | ISSUE-003 |

## 목표

강사가 자습실을 등록·조회·수정·삭제할 수 있게 한다. 수정·삭제가 기존 신청과 충돌할 때 규칙(R6~R8)을 지켜, 이후 신청 API가 생겨도 정원·기간·이력 불변 조건이 깨지지 않게 한다.

## 범위

- 포함
  - `GET /rooms`, `GET /rooms/:id` (강사·학생), `POST /rooms`, `PATCH /rooms/:id`, `DELETE /rooms/:id` (강사)
  - R6 정원 축소 거부 + 취소 가능한 예정 신청 목록, R7 기간 변경 거부 + 충돌 목록
  - R8 삭제 시 예정 신청만 시스템 취소 + 이력
  - 정책 함수(`rooms.policy.ts`, `visit-time.ts`)와 경계값 테스트
  - `PolicyResult` 패턴, 시간대 필수 ISO 일시 검증, Swagger 에러 문서 데코레이터
  - e2e 공용 헬퍼(`test/support/`)와 기존 e2e 리팩터링
- 제외 (다른 이슈로)
  - 자습실 상세의 신청 이력 조회(FR-ROM-03) → ISSUE-006
  - 강사 개별 취소(R11) → ISSUE-007
  - 학생 삭제 시 처리(R9) → ISSUE-005

## 완료 기준

- [x] 학생은 조회만, 등록·수정·삭제는 403 (e2e)
- [x] 등록: 시간대 포함 일시를 UTC로 정규화, 시작 ≥ 종료면 422, 시간대 없는 일시·정원 0·소수·빈 이름·서버 관리 필드는 400 (e2e)
- [x] 목록: 삭제 제외, 운영 시작 순 / 삭제된 자습실 단건 조회 404 (e2e)
- [x] 수정: 보낸 필드만 변경, 빈 body 400, 기간 역전 422, 삭제된 자습실 404 (e2e)
- [x] R6: 정원 = 활성 수는 허용, 미만이면 409 + 예정 신청만 담은 목록, **자습실은 바뀌지 않음** (e2e)
- [x] R7: 예정·지난 방문이 밀려나면 409 + `isPast` 표시, 취소된 신청은 무시 (e2e)
- [x] R8: 예정 신청만 `CANCELED` + `SYSTEM_CANCELED` 이력(prev, reason, Clock 시각), 지난 방문 유지, `activeCount` = 실제 ACTIVE 수 (e2e)
- [x] 정책 경계값: 기간 시작·끝 정각, 정원 = 활성 수 / 활성 수 - 1, 지금 정각 방문은 예정 (단위)
- [x] 수정 쿼리가 실제로 UPDATE 한 문장으로 실행됨을 SQL 로그로 확인
- [x] `npm run verify` 통과, 개발 서버에서 등록·권한·Swagger 확인
- [x] CLAUDE.md 7·10절, `docs/visit-policy.md` 7절, `issues/README.md` 갱신

## 설계 메모

```
modules/
├── rooms/
│   ├── rooms.controller.ts   # @Roles, ParseIdPipe, Swagger
│   ├── rooms.service.ts      # 조회 → 정책 → 저장 조율, 트랜잭션
│   ├── rooms.policy.ts       # checkPeriod, isWithinPeriod, checkCapacityReduction, checkPeriodChange
│   └── dto/                  # CreateRoomDto, UpdateRoomDto(PartialType), RoomResponseDto
└── visits/
    ├── visit-time.ts             # isPastVisit (R5 단일 기준)
    └── visit-history.factory.ts  # systemCanceledHistory, 시스템 취소 사유
```

수정(PATCH) 흐름:

```
트랜잭션 시작
 ├─ 자습실 조회 (없으면 404) → 변경값 병합 → checkPeriod (422)
 ├─ UPDATE study_rooms SET ...
 │    WHERE id = ? AND deletedAt IS NULL
 │      AND activeCount <= :새정원                       ← R6
 │      AND NOT EXISTS (기간 밖 ACTIVE 신청)              ← R7
 └─ 0건이면 원인 진단: 활성 신청을 읽어 R6 → R7 순으로 정책 실행 → 409 + details
```

삭제(DELETE) 흐름: 자습실 `deletedAt` 기록(0건이면 404) → 예정 ACTIVE 신청 조회 → `status = ACTIVE` 조건으로 CANCELED 전환 → 이력 일괄 INSERT → `activeCount` 감소. 모두 한 트랜잭션.

## 작업 체크리스트

- [x] shared 응답·충돌 타입
- [x] PolicyResult, visit-time, history factory
- [x] 정책·단위 테스트
- [x] DTO, 서비스, 컨트롤러, 모듈
- [x] e2e 헬퍼, 자습실 e2e, 기존 e2e 리팩터링
- [x] SQL 로그 확인
- [x] 문서

## 결정 기록 (Decision Log)

| 날짜 | 결정 | 이유 / 검토한 대안 |
|---|---|---|
| 2026-11-15 | **R6~R8을 007이 아니라 004에서 구현 (이슈 범위 변경)** | 원래 계획대로면 신청 API(006)가 merge된 뒤 007 전까지, `main`에서 정원을 신청 수보다 작게 줄이거나 신청이 있는 자습실을 삭제해도 신청이 그대로 남는다. "`main`은 항상 올바른 상태" 규칙을 지키려고, 수정·삭제 API가 처음 생기는 이 이슈에서 불변 조건을 지키는 처리까지 함께 넣었다. 007은 강사 개별 취소(R11)만 남고, R9는 학생 삭제를 만드는 005로 옮겼다. |
| 2026-11-15 | **수정은 "검사 후 UPDATE"가 아니라 조건부 UPDATE 한 문장** | 검사와 UPDATE 사이에 신청이 들어오면 규칙이 깨진다. 정원(`activeCount <= ?`)과 기간(`NOT EXISTS`) 조건을 WHERE에 함께 걸었다. 추측으로 두지 않고 Prisma 쿼리 로그로 실제 SQL이 `UPDATE ... WHERE ... AND NOT EXISTS(SELECT ...)` 한 문장임을 확인했다. |
| 2026-11-15 | **충돌 진단은 실패했을 때만** | 매 수정마다 활성 신청 목록을 읽지 않는다. 대부분의 수정은 충돌이 없으므로, UPDATE가 0건일 때만 목록을 읽어 details를 만든다. |
| 2026-11-15 | **정원(R6)과 기간(R7)이 둘 다 걸리면 정원을 먼저 알림** | 응답 하나에 에러 코드는 하나다. 정원 문제는 강사가 신청을 취소하면 해결되지만, 기간 문제는 지난 방문 때문에 해결 불가일 수 있다. 해결 가능성이 높은 쪽을 먼저 알린다. |
| 2026-11-15 | **진단 결과 위반이 없으면 500** | 조건부 UPDATE는 실패했는데 정책 위반이 없다면 `activeCount`와 실제 ACTIVE 수가 어긋난 것이다. 조용히 넘어가지 않고 오류로 드러낸다. |
| 2026-11-15 | **정책 함수는 `PolicyResult` 반환** | `DomainException`이 `@nestjs/common`의 `HttpStatus`에 의존해서, 정책이 직접 던지면 "정책은 Nest에 의존하지 않는다"는 규칙이 깨진다. 결과 값을 돌려주고 서비스가 `assertPolicy`로 바꾼다. |
| 2026-11-15 | **삭제 시 상태 전이 건수 검증** | 읽은 예정 신청 수와 실제로 CANCELED로 바뀐 수가 다르면 그 사이 다른 변경이 끼어든 것이다. 이력·카운터가 어긋나지 않도록 트랜잭션 전체를 되돌린다(500). 자습실 행을 먼저 갱신해, 같은 자습실에 대한 다른 쓰기가 이 트랜잭션 뒤로 밀리게 했다. |
| 2026-11-15 | **일시 입력에 시간대 필수** | `2026-11-20T19:00:00`처럼 시간대가 없으면 서버 시간대로 해석되어 클라이언트 의도와 9시간 어긋날 수 있다(R10). |
| 2026-11-15 | **이미 끝난 기간으로도 등록 허용** | 과제 규칙에 없는 제한이다. 지난 시각으로는 신청할 수 없으므로(R4) 실제로 문제가 되지 않는다. 규칙을 임의로 늘리지 않았다. |
| 2026-11-15 | **목록 페이지네이션 없음** | 강사 한 명이 운영하는 자습실 수는 수십 개 수준이다. 필요해지면 `?cursor=` 기반으로 추가한다. |
| 2026-11-15 | **e2e 공용 헬퍼 도입, 기존 e2e도 이전** | 테스트 파일마다 앱 생성 코드가 반복되기 시작했다. `createTestApp()`이 `configureApp`과 `FixedClock`을 함께 적용하므로, 실제 설정과 테스트 설정이 어긋날 여지도 줄어든다. |
| 2026-11-15 | **신청 API 전까지 `createVisit()` fixture 사용** | R6~R8을 검증하려면 신청 데이터가 필요하다. fixture도 `activeCount`를 함께 맞춰 실제 불변 조건을 지킨 데이터로 테스트한다. 006 이후에는 API로 만든 데이터로 다시 검증한다. |

## 알려진 한계

- **PostgreSQL 전환 시 재검토 필요**: SQLite는 쓰기를 DB 단위로 직렬화하므로 위 조건부 UPDATE가 안전하다. PostgreSQL의 기본 격리 수준(READ COMMITTED)에서는 `NOT EXISTS` 서브쿼리가 동시에 커밋되는 신청을 못 볼 수 있다. 전환 시 자습실 행을 `SELECT ... FOR UPDATE`로 먼저 잠그거나, 신청 쓰기도 항상 자습실 행을 갱신하도록(006에서 적용 예정) 해 자습실 행을 직렬화 지점으로 쓴다.
