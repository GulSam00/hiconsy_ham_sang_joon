# ISSUE-009: 프론트엔드 셋업

| 항목 | 내용 |
|---|---|
| 상태 | DONE |
| 관련 FR | 화면 공통 (역할 선택은 과제의 "화면에서 강사/학생을 고르는 방식") |
| 관련 정책 | R10, docs/visit-policy.md 6절 |
| 선행 이슈 | ISSUE-008 |

## 목표

강사·학생 화면(010, 011)이 기능 구현에만 집중할 수 있게 공통 기반을 갖춘다. 역할 선택, 요청자 헤더 주입, 에러 처리, 서버 상태 관리, 시간 표시를 한 번 정해 두고 모든 화면이 같은 방식으로 쓰게 한다.

## 범위

- 포함
  - 라이브러리: vue-router, Pinia, TanStack Query, axios, Tailwind CSS, (테스트) Vitest + @vue/test-utils + happy-dom
  - `api/`: axios 클라이언트(요청자 헤더 주입), `ApiError` 변환, 학생 목록·health API
  - `stores/actor`: 역할·선택 학생, `localStorage` 유지
  - `queries/`: QueryClient(재시도 정책, 전역 에러), query key, 학생 목록·health query
  - `router/`: 역할별 화면 접근(`meta.role` + `redirectFor`), 문서 제목
  - 화면: 역할 선택, 헤더(현재 역할·역할 변경), API 상태 표시, 404, 강사·학생 첫 화면 자리
  - `utils/datetime`: KST 표시·입력 변환
- 제외 (다른 이슈로)
  - 강사 화면 → ISSUE-010, 학생 화면 → ISSUE-011
  - 운영 배포 방식(정적 파일 서빙) → ISSUE-012

## 완료 기준

- [x] 역할 선택: 강사 시작, 학생 선택 후 시작, 학생 없음 안내, 목록 실패 시 에러 + 다시 시도 (컴포넌트 테스트)
- [x] 선택 전·목록에 없는 값이면 학생 시작 버튼 비활성 (컴포넌트 테스트, 회귀 방지)
- [x] 요청자 헤더: 강사는 역할만, 학생은 학생 id까지, 미선택이면 없음 (단위)
- [x] 에러 변환: 서버 `ErrorResponse`(details 포함), 응답 없음 → `NETWORK_ERROR`, 다른 형식 → 상태 유지 + `INTERNAL_ERROR` (단위)
- [x] 재시도 정책: 4xx 재시도 안 함, 5xx·네트워크만 (단위)
- [x] 역할 저장: 새로고침 후 복원, 깨진·잘못된 저장값은 버림, 저장소 접근 실패에도 동작 (단위)
- [x] 화면 접근: 미선택 → 역할 선택, 다른 역할 화면 → 내 첫 화면 (단위 + 브라우저)
- [x] KST 변환: 날짜 경계, 왕복 변환, 잘못된 입력 (단위)
- [x] 브라우저: 역할 선택 → 학생 화면, 새로고침 유지, 학생의 강사 화면 접근 차단, 역할 변경, 404, 콘솔 에러 없음
- [x] `npm run verify` 통과, 운영 빌드 성공
- [x] CLAUDE.md 3·9·10절 갱신

## 설계 메모

```
apps/web/src/
├── api/          client.ts(인스턴스·헤더·에러 변환), api-error.ts, students.ts, health.ts
├── stores/       actor.ts (역할·선택 학생만)
├── queries/      keys.ts, query-client.ts, useStudentOptions.ts, useHealth.ts
├── router/       index.ts, route-access.ts (redirectFor: 순수 함수)
├── pages/        RoleSelectPage.vue, teacher/, student/, NotFoundPage.vue
├── components/   AppHeader.vue, ApiStatus.vue, ErrorMessage.vue
└── utils/        datetime.ts, error-message.ts
```

의존 방향: `pages → queries → api → (shared)`, `stores`는 `main.ts`에서 api 클라이언트에 함수로 주입. api·query는 store·router를 import하지 않는다.

## 작업 체크리스트

- [x] 라이브러리 설치 (버전·호환성 확인)
- [x] 날짜 유틸, API 클라이언트·에러, 요청자 저장소
- [x] QueryClient, 라우터, 화면
- [x] 단위·컴포넌트 테스트
- [x] 브라우저 확인, 운영 빌드
- [x] 문서

## 결정 기록 (Decision Log)

| 날짜 | 결정 | 이유 / 검토한 대안 |
|---|---|---|
| 2026-11-15 | **날짜 라이브러리(dayjs 등) 도입하지 않음** | 처음 계획은 dayjs였다. 표시는 내장 `Intl.DateTimeFormat`이 `timeZone: 'Asia/Seoul'`을 지원하고, KST는 일광절약시간이 없어 `datetime-local` 입력도 고정 `+09:00`으로 변환하면 된다. 의존성을 늘리는 대신 작은 함수 3개를 경계값 테스트로 지킨다. |
| 2026-11-15 | **API 클라이언트가 store를 직접 import하지 않고 `getActor` 함수를 주입받음** | 클라이언트가 Pinia에 묶이지 않고, 테스트에서 요청자를 바꿔 넣기 쉽다. 순환 의존(store ↔ api)도 생기지 않는다. |
| 2026-11-15 | **axios 에러를 API 경계에서 `ApiError`로 변환** | 화면이 axios 에러 구조(`error.response.data`)를 알면 HTTP 라이브러리를 바꿀 때 모든 화면을 고쳐야 한다. 화면은 `code`만 본다. 서버 응답이 없는 경우를 위한 `NETWORK_ERROR`를 따로 둬서 서버 ErrorCode와 섞지 않았다. |
| 2026-11-15 | **4xx 재시도 안 함, mutation 재시도 안 함** | 4xx(정원 초과, 권한 없음)는 다시 보내도 같다. 쓰기를 자동 재시도하면 응답만 늦게 온 성공 요청을 한 번 더 보내게 된다. 서버가 중복을 막아 주지만 굳이 보내지 않는다. |
| 2026-11-15 | **요청자 무효 시 전역 처리로 역할 선택에 보냄** | 저장된 학생이 강사에 의해 삭제되면 모든 API가 404를 낸다. 화면마다 처리하지 않고 QueryCache/MutationCache의 onError 한 곳에서 처리한다. 강사가 삭제된 학생을 다룰 때의 404는 화면이 처리하도록 학생 요청자일 때만 반응한다. |
| 2026-11-15 | **역할을 `localStorage`에 저장, 실패해도 무시** | 새로고침마다 역할을 다시 고르는 것은 불편하다. 시크릿 모드 등에서 저장이 실패해도 이번 세션은 메모리 상태로 동작해야 하므로 예외를 삼킨다(저장 실패는 기능 오류가 아님). 읽을 때는 형식을 검사해 이전 버전 데이터 등을 버린다. |
| 2026-11-15 | **화면 접근 제한은 순수 함수 `redirectFor`** | 라우터 가드 안에 분기를 쓰면 테스트하려면 라우터를 띄워야 한다. 판단만 순수 함수로 빼서 단위 테스트한다. 화면 제한은 편의일 뿐 실제 권한은 서버가 검사한다. |
| 2026-11-15 | **버튼 상태를 "찾은 학생" 기준으로 (테스트가 찾은 결함 수정)** | 컴포넌트 테스트를 쓰다가, select가 옵션을 못 잡으면 v-model 값이 `undefined`가 되어 `=== null` 검사를 통과해 **눌러도 반응 없는 활성 버튼**이 생기는 것을 발견했다. 목록에서 실제로 찾은 학생으로 판단하도록 고치고 회귀 테스트를 추가했다. |
| 2026-11-15 | **컴포넌트 테스트 환경은 happy-dom** | jsdom보다 가볍고 이 테스트에 필요한 DOM·`localStorage`를 지원한다. 단, select 값 설정 시 숫자를 옵션 문자열과 맞추지 못하는 차이가 있어 테스트에서는 문자열로 설정한다. |
| 2026-11-15 | **강사·학생 첫 화면은 자리만 둠** | 라우팅·접근 제한을 검증하려면 대상 화면이 있어야 한다. 실제 내용은 010, 011에서 채운다. |
