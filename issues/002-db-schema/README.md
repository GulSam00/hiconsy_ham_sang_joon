# ISSUE-002: DB 스키마와 시드 (Prisma + SQLite)

| 항목 | 내용 |
|---|---|
| 상태 | DONE |
| 관련 FR | 전체 FR의 데이터 기반 (특히 FR-ROM-03 이력, FR-VST-01 정원·중복) |
| 관련 정책 | R1, R3, R8, R9, R10 (CLAUDE.md 5절), 데이터 모델 규칙 (6절) |
| 선행 이슈 | ISSUE-001 |

## 목표

과제의 필수 엔티티(학생, 자습실)와 방문 신청·이력 모델을 스키마로 확정하고, 이후 서비스가 기대는 DB 레벨 보장(유니크, FK, 원자적 정원 확보)이 실제 SQLite에서 동작함을 테스트로 증명한다. 평가자는 `npm install` → `npm run dev`만으로 DB가 준비되어야 한다.

## 범위

- 포함
  - `schema.prisma`: `Student`, `StudyRoom`, `Visit`, `VisitHistory`, enum 3종
  - 초기 마이그레이션
  - `PrismaService`(전역 모듈), 연결 팩토리, WAL·busy timeout 설정
  - 시드 (학생 6명, 자습실 4개: 운영 중, 소규모, 운영 종료, 삭제됨)
  - DB 통합 테스트, e2e 전용 DB
  - health 엔드포인트에 DB 연결 확인 추가
  - `npm run dev` 시 DB 자동 준비 (`predev`)
- 제외 (다른 이슈로)
  - ErrorCode, 예외 필터, Clock → ISSUE-003
  - 실제 CRUD·신청 로직 → ISSUE-004~008
  - 방문 신청 시드 데이터 → API로만 생성 (아래 결정 기록 참고)

## 완료 기준

- [x] 스키마 검증·마이그레이션 생성
- [x] 유니크 제약 위반 시 `P2002`, FK 위반 시 `P2003` (통합 테스트)
- [x] 신청이 있는 자습실 물리 삭제 불가 (`ON DELETE RESTRICT`, 통합 테스트)
- [x] 조건부 원자적 UPDATE: 순차 3회 → `[1, 1, 0]`, **동시 20건 → 정확히 정원(3)만 성공** (통합 테스트)
- [x] 삭제된 자습실은 정원이 남아도 확보 불가 (통합 테스트)
- [x] WAL 모드 적용, DateTime UTC 왕복 (통합 테스트)
- [x] 시드 반복 실행 시 중복 생성 없음
- [x] 빈 디렉토리에서 `npm ci` → `npm run verify` → `npm run dev`로 DB 생성·시드·health `database: up` 확인
- [x] CLAUDE.md 4·6·10절, `docs/erd.md` 갱신

## 설계 메모

```
apps/api
├── prisma.config.ts               # Prisma 7 설정 (스키마·마이그레이션·시드·URL)
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── database/
│   │   ├── database-url.ts        # 기본 URL. CLI와 런타임이 공유
│   │   └── create-prisma-client.ts# 어댑터·PRAGMA. 런타임과 시드가 공유
│   ├── prisma/                    # PrismaService (@Global)
│   └── generated/prisma/          # prisma generate 결과 (커밋 안 함)
└── test/
    ├── test-database.mts          # 테스트 DB 경로
    ├── global-setup.ts            # test.db 재생성
    └── database.e2e-spec.ts       # 스키마 보장 검증
```

ERD와 인덱스 목적: [`docs/erd.md`](../../docs/erd.md)

## 작업 체크리스트

- [x] Prisma 7 설정 형식 확인 (`prisma init` 결과를 임시 디렉토리에서 확인)
- [x] 스키마·마이그레이션
- [x] PrismaService, 연결 팩토리
- [x] 시드
- [x] 통합 테스트·테스트 DB
- [x] 스크립트 (`db:*`, `postinstall`, `predev`)
- [x] 문서

## 결정 기록 (Decision Log)

| 날짜 | 결정 | 이유 / 검토한 대안 |
|---|---|---|
| 2026-11-15 | **Prisma 7.10.1 + `@prisma/adapter-better-sqlite3`** | Prisma 7은 드라이버 어댑터가 필수다. better-sqlite3는 주요 OS용 사전 빌드 바이너리가 있어 평가자 PC에서 네이티브 빌드가 필요 없다. |
| 2026-11-15 | **신청을 `Visit`(현재 상태) + `VisitHistory`(append-only 이력)로 분리** | (a) 이력만 저장하고 상태를 계산(이벤트 소싱): 정원 검사·목록 조회마다 재계산이 필요해 MVP에 과하다. (b) `Visit`에 이력 컬럼 추가: 수정이 여러 번이면 표현할 수 없다. 상태 조회와 감사(audit)의 책임을 나누고, 같은 트랜잭션에서 함께 쓰는 규칙으로 정합성을 지킨다. |
| 2026-11-15 | **`UNIQUE(roomId, studentId)` + 취소 후 재신청 시 행 재활성화** | 대안은 "취소 행은 남기고 새 행 생성 + 부분 유니크 인덱스(`WHERE status='ACTIVE'`)"인데, Prisma 스키마로 부분 인덱스를 표현할 수 없어 raw SQL 마이그레이션이 필요하다. 재활성화 방식은 표준 유니크 제약만으로 "활성 신청 1건" 규칙을 DB가 보장한다. 과거 신청·취소 내역은 이력 테이블에 모두 남는다. |
| 2026-11-15 | **`StudyRoom.activeCount` 비정규화 카운터** | "COUNT 후 INSERT"는 동시 요청에서 정원을 초과한다. 카운터를 두면 `UPDATE … WHERE activeCount < maxPersonnel` 한 문장으로 검사와 증가가 원자적으로 끝나며, 락 없이 PostgreSQL에서도 그대로 동작한다. 통합 테스트로 동시 20건 중 정확히 정원만 성공함을 확인했다. 카운터와 실제 ACTIVE 수가 어긋나는 위험은 "VisitsService에서만 변경" 규칙과 ISSUE-006의 정합성 테스트로 통제한다. |
| 2026-11-15 | **이력에 `roomId`, `studentId` 비정규화** | 자습실 상세 이력(FR-ROM-03)을 JOIN 없이 `(roomId, createdAt)` 인덱스로 조회한다. 이력은 불변이라 비정규화로 인한 불일치가 생기지 않는다. |
| 2026-11-15 | **모든 FK `ON DELETE RESTRICT`** | 학생·자습실은 Soft Delete만 허용한다. 실수로 물리 삭제를 시도하면 DB가 막아 이력이 사라지는 일을 방지한다. |
| 2026-11-15 | **CHECK 제약(`maxPersonnel > 0`, `start < end`)은 DB에 두지 않음** | Prisma 스키마가 CHECK를 지원하지 않아 마이그레이션 SQL을 손으로 고쳐야 한다. SQLite는 컬럼 변경 시 테이블을 재생성하는데, 이후 Prisma가 만든 마이그레이션이 손으로 넣은 CHECK를 지울 수 있다. DTO 검증과 policy 함수(ISSUE-003~004)로 보장한다. |
| 2026-11-15 | **테이블만 snake_case로 매핑, 컬럼은 camelCase 유지** | 테이블 이름은 DB 관례를 따르되, 모든 컬럼에 `@map`을 붙이면 스키마가 두 배로 길어지고 유지보수 비용 대비 효과가 낮다. |
| 2026-11-15 | **`DATABASE_URL` 기본값을 코드에 둠 (.env 불필요)** | 평가자가 `.env`를 만들지 않아도 실행돼야 한다. Prisma 7은 `.env`를 자동으로 읽지 않으므로, CLI(`prisma.config.ts`)와 런타임이 같은 `resolveDatabaseUrl()`을 써서 서로 다른 DB 파일을 보는 일을 막았다. |
| 2026-11-15 | **WAL 모드 + busy timeout 5초** | WAL은 읽기가 쓰기를 막지 않게 하고, busy timeout은 동시 쓰기 시 즉시 `SQLITE_BUSY`로 실패하지 않고 대기하게 한다. PRAGMA는 SQLite 전용이라 `src/database/` 한 곳에만 둔다. |
| 2026-11-15 | **시드에 방문 신청을 넣지 않음** | 신청은 `activeCount` 증가와 이력 INSERT를 같은 트랜잭션에서 해야 한다. 시드가 이를 직접 쓰면 서비스 규칙을 중복 구현하게 된다. 데모 신청은 API로 만든다. |
| 2026-11-15 | **시드 날짜를 실행 시점 기준(KST)으로 생성** | 고정 날짜를 쓰면 평가 시점에 모든 자습실이 "운영 종료"일 수 있다. KST는 일광절약시간이 없어 고정 +9시간 오프셋으로 충분하다 (dayjs는 Clock 도입 시 ISSUE-003에서 추가). |
| 2026-11-15 | **`npm run dev`의 `predev`에서 DB 자동 준비** | 평가자가 `npm install && npm run dev`만 해도 동작해야 한다. `migrate deploy`와 시드 모두 반복 실행에 안전하다. |
| 2026-11-15 | **e2e DB 준비: `migrate reset` 대신 "파일 삭제 → `migrate deploy`"** | Prisma CLI가 AI 에이전트 실행을 감지하면 사용자 동의 없이 `migrate reset`을 거부한다. 테스트 DB는 테스트가 만들고 버리는 파일이므로, 파일 삭제 + 비파괴 명령(`deploy`) 조합이 더 단순하고 의도에도 맞다. 개발 DB를 잘못 지우지 않도록 파일 이름이 `test.db`일 때만 삭제한다. |
| 2026-11-15 | **health에 DB 확인 추가** | ISSUE-002 시점에 PrismaService를 실제로 쓰는 곳이 없으면 연결 설정 오류를 ISSUE-004에서야 발견한다. DB 장애 시 503을 반환하고, 내부 경로 등 원인은 로그에만 남긴다. |
| 2026-11-15 | **테스트 DB 경로 상수만 `.mts`(ESM)로 둠** | Vitest 설정(ESM)이 CJS 파일을 import하면 Vite가 경고를 낸다. 설정과 테스트가 함께 쓰는 상수 파일만 ESM으로 바꿨다. |
