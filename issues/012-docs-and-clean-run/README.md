# ISSUE-012: 문서화와 클린 환경 실행 검증 (README, docs, docker-compose)

| 항목 | 내용 |
|---|---|
| 상태 | DONE |
| 관련 FR | - (과제 제출 요건: 실행 방법, 기술 스택·선택 이유, 아키텍처·컨벤션, DB 스키마·설계 이유, 고민한 점) |
| 관련 정책 | 전체 (R1~R12 요약을 README에 연결) |
| 선행 이슈 | ISSUE-011 |

## 목표

평가자가 README만 보고 한 번에 실행할 수 있고, 무엇을 왜 이렇게 만들었는지 README에서 바로 읽을 수 있게 한다.

## 범위

- 포함: README 전면 작성, `docs/architecture.md`, Docker 실행 경로(Dockerfile, docker-compose.yml), 깨끗한 디렉터리에서 README 절차 검증
- 제외: 기능 변경, 운영 배포 구성(nginx, CI/CD)

## 완료 기준

- [x] README에 과제 필수 항목 5개(실행 방법, 기술 스택·선택 이유, 아키텍처·컨벤션, DB 스키마·설계 이유, 고민한 점)
- [x] 헤더 식별이 보안 장치가 아니라는 한계, SQLite → PostgreSQL 전환 방침, Node 22.12 요구를 README에 명시
- [x] `docs/architecture.md` (구조, 요청 흐름, 동시성, 이력, 프론트 데이터 흐름, 실행 형태)
- [x] docker-compose 추가 여부 결정 → 추가하고 실제로 빌드·실행 확인
- [x] 새로 clone한 디렉터리에서 README 절차(`npm install` → `npm run dev`) 동작 확인
- [x] 같은 디렉터리에서 `npm run verify` 통과
- [x] CLAUDE.md 명령어 표 갱신

## 설계 메모

### 문서 배치

| 문서 | 독자 | 내용 |
|---|---|---|
| `README.md` | 평가자 | 과제 필수 항목. 결론과 이유를 짧게, 상세는 링크 |
| `docs/architecture.md` | 코드를 읽는 사람 | 요청 흐름, 동시성 표, 계층별 책임 |
| `docs/visit-policy.md` | 정책을 확인하는 사람 | 상태, 행위별 이력, 불변 조건 (기존) |
| `docs/erd.md` | | Mermaid ERD (기존) |
| `CLAUDE.md` | AI 도구·개발자 | 작업 규칙 (기존) |

같은 설명을 여러 문서에 길게 반복하지 않는다. 한쪽만 고쳐져 어긋나기 때문이다.

### Docker 구성

- 이미지 하나(`study-room:local`), 서비스 둘
  - `api`: `npm run db:setup && node dist/main.js`, `DATABASE_URL=file:/data/dev.db`, `db-data` 볼륨, health 확인 후 web 시작
  - `web`: `vite preview` :4173, `VITE_API_TARGET=http://api:3000` (preview는 `server.proxy`를 그대로 씀)
- 베이스 이미지 `node:22-bookworm-slim`을 digest로 고정 (Node 22.23.5)

## 작업 체크리스트

- [x] 이슈 결정 기록(001~011)에서 "고민한 점" 소재 추리기
- [x] README 작성, 문서 속 함수·파일 이름·API 역할을 코드와 대조
- [x] `docs/architecture.md` 작성
- [x] Dockerfile, .dockerignore, docker-compose.yml 작성
- [x] Docker 빌드·실행 확인
- [x] 클린 clone 실행·브라우저 흐름·verify 확인
- [x] `npm audit` 경고 확인과 대응 결정

## 검증 결과

**클린 clone** (`git clone` 직후 디렉터리, 이 PR 브랜치)

| 단계 | 결과 |
|---|---|
| `npm install` | 성공 (약 60초). postinstall이 shared 빌드, Prisma Client 생성 |
| `npm run dev` | 약 10초 안에 health `database: up`, 웹 200, Swagger 200, `dev.db` 생성 |
| 브라우저 흐름 (Chromium, 실제 API) | 강사: 신청자 표시 → 정원 축소 충돌 → 사유 취소 → 다시 저장 성공 → 삭제 → 학생 관리. 학생: 정원 마감 표시 → 신청 → 시간 변경 → 본인 취소 → 다시 신청 → 강사 취소 사유 표시 → 삭제된 학생은 역할 선택으로. 자바스크립트 오류 없음 (콘솔의 409·404는 의도된 응답) |
| `npm run verify` | 통과 (api 110, web 97, e2e 103) |

이 머신의 npm 캐시는 남아 있으므로, "깨끗한 디렉터리" 검증이지 "깨끗한 머신" 검증은 아니다.

**Docker** (`docker compose up`)

| 확인 | 결과 |
|---|---|
| 빌드 | 성공 |
| 기동 | api healthy 후 web 시작 |
| 웹 `/`, SPA 깊은 경로 `/student/visits` | 200, index.html |
| 웹 → API 프록시 (`/api/health`, 학생 신청 POST) | 성공 |
| `down` → `up` 후 | 신청 데이터 유지, 시드는 "이미 데이터가 있어 건너뜀" |

이 샌드박스는 사내 프록시 인증서가 있어야 외부로 나갈 수 있어, 검증할 때만 인증서를 넣은 베이스 이미지를 `--build-arg BASE_IMAGE=…`로 바꿔 빌드했다. 저장소의 Dockerfile 내용은 같다.

## 결정 기록 (Decision Log)

| 날짜 | 결정 | 이유 / 검토한 대안 |
|---|---|---|
| 2026-11-16 | **docker-compose를 추가함** | 실행 실패 가능성이 가장 큰 요인은 Node 버전(≥22.12)이다. 평가자 PC가 Node 20이면 `npm install`부터 막힌다. Docker는 그 경우의 대안 경로다. 검증하지 못한 Dockerfile은 넣지 않기로 했고, 이 환경에서 실제로 빌드·실행·재기동을 확인했다. 기본 경로는 여전히 `npm run dev`다. |
| 2026-11-16 | **이미지 하나 + `vite preview`, nginx 미사용** | nginx 서비스를 두면 운영 구조에 더 가깝지만, 이미지·설정 파일이 하나씩 늘고 Docker Hub에서 받을 이미지도 늘어난다(검증 중 요청 한도 429를 실제로 겪었다). 목적은 평가 환경 재현이므로 Node 이미지 하나로 끝냈다. `vite preview`가 운영용이 아니라는 점은 README·compose 주석에 적었다. |
| 2026-11-16 | **Docker에서 웹 포트는 4173** | 개발 서버(5173)와 동시에 띄워도 충돌하지 않고, Vite preview의 기본 포트라 의미가 드러난다. |
| 2026-11-16 | **Dockerfile은 의존성 레이어를 나누지 않음** | `npm ci --ignore-scripts`로 레이어를 나누면 postinstall(shared 빌드, Prisma 생성)과 better-sqlite3 네이티브 설치를 따로 다시 실행해야 해서, 로컬 설치와 다른 경로가 된다. 이미지를 자주 다시 빌드하는 용도가 아니므로 단순함을 택했다. |
| 2026-11-16 | **베이스 이미지를 `BASE_IMAGE` 인자로 열어 둠** | 버전 고정을 위해 digest로 고정하되, 사내 프록시 인증서가 필요한 환경(이 검증 환경도 그랬다)에서 Dockerfile을 고치지 않고 빌드할 수 있게 했다. |
| 2026-11-16 | **운영 정적 파일 서빙은 구현하지 않고 방침만 문서화** | Nest에서 web `dist`를 서빙하면(`@nestjs/serve-static`) 의존성과 라우팅 예외(`/api` 제외 SPA fallback)가 생긴다. 과제 범위 밖이고, 실제 배포라면 정적 파일은 nginx·CDN, `/api`는 리버스 프록시가 맡는 편이 일반적이다. 개발·Docker·운영 모두 "같은 origin + `/api` 프록시" 구조라 CORS 설정이 필요 없다. |
| 2026-11-16 | **`npm audit` 경고(moderate 12건)는 고치지 않고 README에 이유를 적음** | 전부 개발 도구(ESLint 플러그인, 테스트 유틸)가 쓰는 `minimatch`·`glob` 경로이고 운영 의존성은 0건이다. `npm audit fix --force`가 제안하는 것은 typescript-eslint 8.72 → 8.36, @vue/test-utils 2.6 → 2.4로 **내리는** 변경이라 TypeScript 6 고정과 충돌할 수 있다. 평가자가 설치 경고를 보고 의아해하지 않게 README "알려진 한계"에 적었다. |
| 2026-11-16 | **Node 버전 미달 시 동작을 직접 확인해 README에 오류 코드를 적음** | "`engine-strict`로 멈춘다"는 추측이었다. 요구 버전을 높인 임시 프로젝트로 `npm install`이 `EBADENGINE`으로 실패함을 확인하고, 평가자가 오류를 보고 원인을 알 수 있게 코드를 적었다. |
| 2026-11-16 | **README의 이름·역할·조건을 코드와 대조** | 문서의 함수 이름(`checkVisitTime`), 조건부 UPDATE 조건(취소의 `visitAt >= now`, 신청의 운영 기간), API별 허용 역할을 소스에서 확인했다. 문서가 코드와 다르면 평가자를 잘못 안내한다. |
