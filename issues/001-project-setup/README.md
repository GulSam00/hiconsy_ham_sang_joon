# ISSUE-001: 프로젝트 셋업

| 항목 | 내용 |
|---|---|
| 상태 | DONE |
| 관련 FR | - |
| 관련 정책 | - |
| 선행 이슈 | - |

## 목표

`npm install` 한 번으로 api와 web이 함께 뜨고, 공용 패키지를 통해 타입을 공유하며, 린트·타입 검사·테스트를 명령 하나로 돌릴 수 있는 모노레포 뼈대를 만든다.

## 범위

- 포함
  - npm workspaces 모노레포 (`apps/api`, `apps/web`, `packages/shared`)
  - TypeScript 공통 설정 (`tsconfig.base.json`, strict)
  - ESLint(flat config, 타입 기반 규칙) + Prettier
  - NestJS 최소 앱 + `GET /api/health` + 단위·e2e 테스트
  - Vue 3 + Vite 최소 앱 + `/api` 개발 프록시 + health 확인 화면
  - 루트 스크립트: `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`, `verify`
- 제외 (다른 이슈로)
  - Prisma, SQLite → ISSUE-002
  - ErrorCode, 예외 필터, ValidationPipe, Clock, Swagger → ISSUE-003
  - Router, Pinia, TanStack Query, Tailwind, axios → ISSUE-009
  - README 본문, docker-compose → ISSUE-012

## 완료 기준

- [x] `npm ci` 후 `packages/shared`가 자동 빌드됨 (`postinstall`)
- [x] `npm run dev`로 api(:3000), web(:5173)이 뜨고, 브라우저에서 web → 프록시 → api 호출이 성공함
- [x] `GET /api/health` 200, prefix 없는 `/health`는 404 (e2e 테스트)
- [x] api 운영 빌드(`npm run build`) 후 `npm start -w @study-room/api`로 실행됨
- [x] `npm run verify` 통과 (format:check, lint, typecheck, test, test:e2e)
- [x] 작업 디렉토리가 아닌 **빈 디렉토리에서 `npm ci`부터** 위 항목 재검증
- [x] CLAUDE.md 3절(스택), 4절(명령어), 9·10절(컨벤션, 테스트) 갱신

## 설계 메모

```
.
├── package.json            # workspaces, 루트 스크립트
├── tsconfig.base.json      # strict 공통 옵션
├── eslint.config.mjs       # 전 워크스페이스 공용 flat config
├── packages/shared         # ESM, tsc → dist (types + js)
└── apps
    ├── api                 # NestJS, CommonJS, nest build
    │   ├── src/app.setup.ts    # main.ts와 e2e가 공유하는 전역 설정
    │   ├── src/health/
    │   └── test/               # e2e
    └── web                 # Vue 3 + Vite, /api → :3000 프록시
```

- 의존 방향: `apps/api` → `packages/shared` ← `apps/web`. shared는 어떤 앱에도 의존하지 않는다.
- `API_PREFIX`를 shared에 둬서 api의 global prefix와 web의 프록시 경로가 어긋나지 않게 했다.

## 작업 체크리스트

- [x] 루트 설정 (`.nvmrc`, `.npmrc`, `.editorconfig`, `.gitignore`, Prettier)
- [x] `packages/shared`
- [x] `apps/api` + health + 테스트
- [x] `apps/web` + health 화면
- [x] ESLint
- [x] 개발 서버, 운영 빌드, 브라우저 렌더링 확인
- [x] 클린 환경 검증

## 결정 기록 (Decision Log)

| 날짜 | 결정 | 이유 / 검토한 대안 |
|---|---|---|
| 2026-11-15 | **TypeScript 6.0.3 고정** | `latest`는 7.0.2지만 `typescript-eslint` peer가 `<6.1.0`, Nest CLI 의존성이 `~6.0.2`, `ts-jest` peer가 `<7`이다. 7을 쓰면 린트와 Nest 빌드 체인이 공식 지원 범위를 벗어난다. |
| 2026-11-15 | **shared는 ESM 전용 + `dist` 빌드** | (a) TS 소스를 직접 참조: Nest 빌드가 `rootDir` 밖 파일을 컴파일하려다 실패. (b) CJS 전용: Vite 개발 서버가 링크된 CJS 패키지를 그대로 브라우저에 보내 깨짐(`optimizeDeps` 강제 필요). (c) CJS·ESM 이중 빌드: 설정이 두 배. Node 22.12+의 `require(esm)`으로 CJS인 api가 ESM을 바로 불러올 수 있어 (d) ESM 전용을 택했다. 대가로 Node ≥ 22.12가 필요하며 `engines`와 `.nvmrc`로 명시했다 (Node 20은 2026-04 EOL). |
| 2026-11-15 | **테스트 러너: Jest 대신 Vitest** | Jest(CJS 모드)는 ESM 전용인 shared를 `require`하지 못한다(Jest의 ESM 지원은 실험 단계). Vitest는 ESM을 기본 지원하고, Nest 공식 문서에 Vitest + SWC 구성이 있다. web도 Vitest를 쓰게 되므로 러너가 하나로 통일된다. |
| 2026-11-15 | **api 테스트는 SWC로 변환** | Vitest가 쓰는 esbuild는 `emitDecoratorMetadata`를 지원하지 않아 Nest 생성자 주입이 동작하지 않는다. `unplugin-swc`로 데코레이터 메타데이터를 생성한다. |
| 2026-11-15 | **npm workspaces** (pnpm 아님) | 평가자 PC에 pnpm이 없을 수 있다. 추가 설치 없이 실행 가능해야 한다는 과제 조건을 우선했다. |
| 2026-11-15 | **개발 중 CORS 대신 Vite 프록시** | 같은 origin으로 호출하므로 CORS 설정과 preflight가 필요 없다. 운영 배포 시 정적 파일 서빙 방식은 ISSUE-012에서 정한다. |
| 2026-11-15 | **`configureApp()`으로 전역 설정 일원화** | `main.ts`에만 prefix·pipe를 설정하면 e2e 테스트가 실제와 다른 앱을 검증하게 된다. 두 곳이 같은 함수를 쓰게 했다. |
| 2026-11-15 | **api에서 `consistent-type-imports` 끔** | Nest DI는 생성자 파라미터의 값 import로 메타데이터를 만든다. 자동 수정이 `import type`으로 바꾸면 런타임에 주입 대상이 `undefined`가 된다. |
| 2026-11-15 | **Markdown은 Prettier 제외** | 한글이 섞인 표를 Prettier가 과도하게 패딩해 diff가 커지고 가독성이 떨어진다. |
