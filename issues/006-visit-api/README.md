# ISSUE-006: 방문 신청·수정·취소 API와 이력

| 항목 | 내용 |
|---|---|
| 상태 | DONE |
| 관련 FR | FR-VST-01, 02, 03, FR-ROM-03 |
| 관련 정책 | R1~R5, R10, R12, docs/visit-policy.md 2·4절 |
| 선행 이슈 | ISSUE-005 |

## 목표

학생이 방문을 신청·수정·취소하고, 강사가 자습실 상세에서 신청자와 이력을 시간순으로 볼 수 있게 한다. 동시 요청에서도 정원·중복 규칙이 깨지지 않고, 이력만으로 현재 상태를 복원할 수 있음을 테스트로 증명한다.

## 범위

- 포함
  - `POST /rooms/:roomId/visits` (학생, 신청·재신청)
  - `PATCH /visits/:id` (학생 본인, 시간 수정, R12)
  - `POST /visits/:id/cancel` (학생 본인, 사유 선택)
  - `GET /rooms/:roomId/histories` (강사, FR-ROM-03), `GET /rooms/:roomId/visits` (강사, 신청자 목록)
  - 정책 함수(`visits.policy.ts`), 이력 재생(`visit-history.replay.ts`), shared↔Prisma enum 일치 검사
  - 동시성·중복 제출·이력 재생 e2e
- 제외 (다른 이슈로)
  - 강사 취소(R11) → ISSUE-007
  - 학생 본인의 신청 목록(FR-VST-04) → ISSUE-008

## 완료 기준

- [x] 신청: ACTIVE + APPLIED 이력(prev null, next, Clock 시각) + 정원 +1 (e2e)
- [x] 지난 시각·기간 밖 422, 중복 409, 정원 초과 409, 삭제된 자습실·학생 404, 강사 403 (e2e)
- [x] 정원이 찬 뒤 한 명이 취소하면 다시 신청 가능 (정원 복원, e2e)
- [x] 시간 수정: TIME_CHANGED(prev → next), 같은 시각이면 200 + 이력 없음(R12), 남의 신청 403, 취소됨·지난 방문 409 (e2e)
- [x] 취소: CANCELED + 정원 -1 + 사유 기록, body 없이도 가능, 중복 취소 409 (e2e)
- [x] 재신청은 같은 신청 행을 REAPPLIED로 재활성화 (e2e)
- [x] 이력: 강사만, 기록 시각순·같은 시각이면 기록 순, 학생 이름 포함 (e2e)
- [x] **동시성: 정원 3명에 10명 동시 신청 → 정확히 3명 성공, 7명 ROOM_FULL, 카운터 일치** (e2e, 15회 반복 안정)
- [x] **중복 제출: 같은 학생 5번 동시 신청 → 1건만 생성** (e2e)
- [x] **동시 이중 취소: 한 번만 성공, 정원도 한 번만 복원** (e2e)
- [x] **이력 재생 = 현재 상태** (신청·수정·취소·재신청 혼합 시나리오, e2e)
- [x] 정책 경계값 단위 테스트, shared↔Prisma enum 컴파일 시점 일치 확인
- [x] `npm run verify` 통과, 개발 서버에서 신청 → 수정 → 취소 → 이력 조회 확인
- [x] CLAUDE.md 7·9·10절 갱신

## 설계 메모

```
modules/visits/
├── room-visits.controller.ts   # /rooms/:roomId/visits, /rooms/:roomId/histories
├── visits.controller.ts        # /visits/:id (PATCH), /visits/:id/cancel
├── visits.service.ts           # 조회 → 정책 → 조건부 UPDATE → 이력, 한 트랜잭션
├── visits.policy.ts            # checkVisitTime, checkNotDuplicated, checkChangeable, isSameVisitTime
├── visit-history.factory.ts    # visitHistory, systemCanceledHistory, actorTypeOf
├── visit-history.replay.ts     # replayVisitHistory (불변 조건 검증용)
├── visit-time.ts               # isPastVisit (R5 단일 기준)
├── system-cancel.ts            # R8·R9 공통 (ISSUE-005)
├── enum-sync.ts                # shared ↔ Prisma enum 컴파일 시점 일치 검사
└── dto/
```

신청 흐름:

```
트랜잭션
 ├─ 자습실(삭제 안 됨) 조회 ─ 404
 ├─ 학생(삭제 안 됨) 조회 ─ 404
 ├─ checkVisitTime ─ 422 (지난 시각 → 기간 밖 순)
 ├─ 기존 신청 조회 → checkNotDuplicated ─ 409
 ├─ 좌석 확보: UPDATE study_rooms SET activeCount+1
 │     WHERE id AND deletedAt IS NULL AND activeCount < maxPersonnel AND 기간 안
 │     0건 → 재조회해 404 / 422 / 409 ROOM_FULL 진단
 ├─ 신규 INSERT 또는 재활성화(WHERE status = CANCELED, 0건이면 409 중복)
 └─ 이력 INSERT (APPLIED | REAPPLIED)
트랜잭션 밖: 동시 첫 신청의 유니크 위반(P2002) → 409 DUPLICATE_VISIT (좌석은 함께 롤백)
```

## 작업 체크리스트

- [x] shared 신청·이력 타입
- [x] enum 일치 검사
- [x] 정책·이력 재생·이력 팩토리와 단위 테스트
- [x] DTO, 서비스, 컨트롤러 2개, 모듈
- [x] e2e (기능, 동시성, 불변 조건), 동시성 15회 반복
- [x] 개발 서버 확인
- [x] 문서

## 결정 기록 (Decision Log)

| 날짜 | 결정 | 이유 / 검토한 대안 |
|---|---|---|
| 2026-11-15 | **좌석 확보 조건에 운영 기간도 포함** | 정원만 보면, 신청이 기간을 검사한 직후 강사가 기간을 바꿨을 때 기간 밖 신청이 생길 수 있다. 기간 조건을 같은 UPDATE에 넣어 한 문장으로 판단한다. |
| 2026-11-15 | **시간 수정은 자습실 행을 갱신하지 않음 (ISSUE-004 계획 변경)** | 004에서 "모든 신청 쓰기가 자습실 행을 갱신하게 해 직렬화 지점으로 쓴다"고 했다. 그런데 Prisma는 행을 갱신하면 `updatedAt`을 자동으로 바꿔, 시간 수정만으로 자습실의 수정 시각이 바뀌는 부작용이 생긴다. 대신 신청 행 UPDATE에 관계 필터(`room: { 기간 조건 }`)를 걸어 한 문장으로 판단한다. PostgreSQL 전환 시에는 자습실 행 `SELECT ... FOR UPDATE`가 필요하다(알려진 한계). |
| 2026-11-15 | **시간 수정에 "읽은 시각 그대로" 조건** | 같은 신청의 시간 수정이 동시에 두 번 오면, 늦은 쪽 이력의 prev가 실제 직전 값과 달라진다. 읽은 값과 다르면 0건이 되어 트랜잭션을 되돌린다. |
| 2026-11-15 | **정책 검사를 UPDATE 전에 한 번, 실패 시 한 번 더** | UPDATE 조건만으로도 규칙은 지켜지지만, 0건만으로는 "왜" 실패했는지 알 수 없다. 앞의 검사는 정확한 에러 코드를, 조건부 UPDATE는 동시성 안전을 맡는다. |
| 2026-11-15 | **이력 시각은 요청 시작 시점의 Clock 값 하나** | 한 요청 안의 "지금"이 여러 값이면 정책 판단 시각과 이력 시각이 어긋날 수 있다. 요청마다 `now`를 한 번 읽어 판단·기록에 모두 쓴다. |
| 2026-11-15 | **취소 사유는 학생에게 선택** | 학생 본인 취소는 사유 없이도 의미가 분명하다. 강사 취소(R11)는 007에서 필수로 만든다. |
| 2026-11-15 | **`isPast`는 응답 시점 계산** | 저장하지 않으므로 배치 작업 없이 항상 정확하다(R5). 응답에 포함해 FE가 시간 비교 로직을 따로 갖지 않게 했다. |
| 2026-11-15 | **신청자 목록 API(`GET /rooms/:id/visits`) 추가** | 이력만으로는 "지금 누가 오는지"를 강사가 직접 계산해야 한다. 자습실 상세와 강사 취소(007) 화면에 필요하다. |
| 2026-11-15 | **shared↔Prisma enum 일치를 타입으로 검사** | FE용 enum을 shared에 따로 두면 DB enum과 어긋날 수 있다. shared가 Prisma에 의존할 수는 없으므로, api에서 두 타입이 같은지 컴파일 시점에 확인한다. |
| 2026-11-15 | **이력 목록 페이지네이션 없음** | 자습실 하나의 이력은 정원 × 수정 횟수 수준이다. 커지면 `(roomId, createdAt)` 인덱스를 이용한 커서 방식으로 추가한다. |

## 테스트의 한계 (정직하게 남김)

- **better-sqlite3는 연결이 하나라 트랜잭션이 사실상 차례로 실행된다.** 그래서 동시성 e2e(10명 동시 신청 등)는 "동시 HTTP 요청에서도 규칙이 지켜진다"는 것은 증명하지만, "조건부 UPDATE가 없었다면 깨졌을 것"까지는 증명하지 못한다. 조건부 UPDATE 자체의 원자성은 ISSUE-002의 DB 통합 테스트(트랜잭션 없이 동시 20건 → 정원만큼만 성공)가 따로 증명한다.
- 동시성 e2e는 15회 반복 실행해 모두 통과했다. 간헐 실패가 있었다면 이 횟수에서 드러났을 가능성이 높지만, 확률적 검증이라는 한계는 있다.
